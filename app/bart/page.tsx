"use client";

import { useCallback, useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { listBartAssets } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { BART_TYPES } from "@/app/lib/bart-types";
import { AssetList } from "./_components/AssetList";
import { UploadAssetDialog } from "./_components/UploadAssetDialog";

export default function BartPage() {
  const [selectedType, setSelectedType] = useState(1);

  const fetchAssets = useCallback(() => listBartAssets(selectedType), [selectedType]);
  const { data: assets, loading, error, refresh } = useApiResource(fetchAssets);

  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="BART Assets"
        actions={
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            Upload asset
          </Button>
        }
      />

      <div className="mb-4">
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(Number(e.target.value))}
            className="w-64 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {BART_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-foreground/70">Loading assets…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {assets && <AssetList assets={assets} onChanged={refresh} />}

      <UploadAssetDialog
        open={uploadOpen}
        type={selectedType}
        onClose={() => setUploadOpen(false)}
        onUploaded={refresh}
      />
    </div>
  );
}
