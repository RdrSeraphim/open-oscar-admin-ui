"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { updateICQProfile } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";
import type {
  IcqAffiliations,
  IcqBasicInfo,
  IcqInterests,
  IcqMoreInfo,
  IcqPermissions,
  IcqProfile,
  IcqWorkInfo,
} from "@/app/lib/types";

const inputClass = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

export function IcqProfileForm({
  screenName,
  profile,
}: {
  screenName: string;
  profile: IcqProfile;
}) {
  const [basicInfo, setBasicInfo] = useState<IcqBasicInfo>(profile.basic_info);
  const [moreInfo, setMoreInfo] = useState<IcqMoreInfo>(profile.more_info);
  const [workInfo, setWorkInfo] = useState<IcqWorkInfo>(profile.work_info);
  const [notes, setNotes] = useState(profile.notes);
  const [interests, setInterests] = useState<IcqInterests>(profile.interests);
  const [affiliations, setAffiliations] = useState<IcqAffiliations>(profile.affiliations);
  const [permissions, setPermissions] = useState<IcqPermissions>(profile.permissions);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function basicField<K extends keyof IcqBasicInfo>(key: K, value: IcqBasicInfo[K]) {
    setBasicInfo((prev) => ({ ...prev, [key]: value }));
  }
  function moreField<K extends keyof IcqMoreInfo>(key: K, value: IcqMoreInfo[K]) {
    setMoreInfo((prev) => ({ ...prev, [key]: value }));
  }
  function workField<K extends keyof IcqWorkInfo>(key: K, value: IcqWorkInfo[K]) {
    setWorkInfo((prev) => ({ ...prev, [key]: value }));
  }
  function interestField<K extends keyof IcqInterests>(key: K, value: IcqInterests[K]) {
    setInterests((prev) => ({ ...prev, [key]: value }));
  }
  function affiliationField<K extends keyof IcqAffiliations>(
    key: K,
    value: IcqAffiliations[K],
  ) {
    setAffiliations((prev) => ({ ...prev, [key]: value }));
  }
  function permissionField<K extends keyof IcqPermissions>(
    key: K,
    value: IcqPermissions[K],
  ) {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateICQProfile(screenName, {
        uin: profile.uin,
        basic_info: basicInfo,
        more_info: moreInfo,
        work_info: workInfo,
        notes,
        interests,
        affiliations,
        permissions,
      });
      showToast("ICQ profile saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ICQ profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Basic Info</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Nickname
            <input
              maxLength={20}
              value={basicInfo.nickname}
              onChange={(e) => basicField("nickname", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            First name
            <input
              maxLength={64}
              value={basicInfo.first_name}
              onChange={(e) => basicField("first_name", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Last name
            <input
              maxLength={64}
              value={basicInfo.last_name}
              onChange={(e) => basicField("last_name", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Email
            <input
              maxLength={64}
              value={basicInfo.email}
              onChange={(e) => basicField("email", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            City
            <input
              maxLength={64}
              value={basicInfo.city}
              onChange={(e) => basicField("city", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            State
            <input
              maxLength={64}
              value={basicInfo.state}
              onChange={(e) => basicField("state", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Phone
            <input
              maxLength={30}
              value={basicInfo.phone}
              onChange={(e) => basicField("phone", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fax
            <input
              maxLength={30}
              value={basicInfo.fax}
              onChange={(e) => basicField("fax", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Address
            <input
              maxLength={64}
              value={basicInfo.address}
              onChange={(e) => basicField("address", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Cell phone
            <input
              maxLength={30}
              value={basicInfo.cell_phone}
              onChange={(e) => basicField("cell_phone", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            ZIP
            <input
              maxLength={12}
              value={basicInfo.zip}
              onChange={(e) => basicField("zip", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Country code
            <input
              type="number"
              value={basicInfo.country_code}
              onChange={(e) => basicField("country_code", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            GMT offset
            <input
              type="number"
              value={basicInfo.gmt_offset}
              onChange={(e) => basicField("gmt_offset", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Origin city
            <input
              maxLength={64}
              value={basicInfo.origin_city}
              onChange={(e) => basicField("origin_city", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Origin state
            <input
              maxLength={64}
              value={basicInfo.origin_state}
              onChange={(e) => basicField("origin_state", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Origin country code
            <input
              type="number"
              value={basicInfo.origin_country_code}
              onChange={(e) =>
                basicField("origin_country_code", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={basicInfo.publish_email}
            onChange={(e) => basicField("publish_email", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Publish email
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">More Info</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Gender (0=unspecified, 1=female, 2=male)
            <input
              type="number"
              min={0}
              max={2}
              value={moreInfo.gender}
              onChange={(e) => moreField("gender", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Homepage
            <input
              maxLength={127}
              value={moreInfo.homepage}
              onChange={(e) => moreField("homepage", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Birth year
            <input
              type="number"
              value={moreInfo.birth_year}
              onChange={(e) => moreField("birth_year", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Birth month (0-12)
            <input
              type="number"
              min={0}
              max={12}
              value={moreInfo.birth_month}
              onChange={(e) => moreField("birth_month", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Birth day (0-31)
            <input
              type="number"
              min={0}
              max={31}
              value={moreInfo.birth_day}
              onChange={(e) => moreField("birth_day", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Language 1 (code)
            <input
              type="number"
              value={moreInfo.lang1}
              onChange={(e) => moreField("lang1", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Language 2 (code)
            <input
              type="number"
              value={moreInfo.lang2}
              onChange={(e) => moreField("lang2", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Language 3 (code)
            <input
              type="number"
              value={moreInfo.lang3}
              onChange={(e) => moreField("lang3", Number(e.target.value))}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Work Info</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Company
            <input
              maxLength={64}
              value={workInfo.company}
              onChange={(e) => workField("company", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Department
            <input
              maxLength={64}
              value={workInfo.department}
              onChange={(e) => workField("department", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Position
            <input
              maxLength={64}
              value={workInfo.position}
              onChange={(e) => workField("position", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Occupation code
            <input
              type="number"
              value={workInfo.occupation_code}
              onChange={(e) => workField("occupation_code", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Address
            <input
              maxLength={64}
              value={workInfo.address}
              onChange={(e) => workField("address", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            City
            <input
              maxLength={64}
              value={workInfo.city}
              onChange={(e) => workField("city", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            State
            <input
              maxLength={64}
              value={workInfo.state}
              onChange={(e) => workField("state", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            ZIP
            <input
              maxLength={12}
              value={workInfo.zip}
              onChange={(e) => workField("zip", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Country code
            <input
              type="number"
              value={workInfo.country_code}
              onChange={(e) => workField("country_code", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Phone
            <input
              maxLength={30}
              value={workInfo.phone}
              onChange={(e) => workField("phone", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fax
            <input
              maxLength={30}
              value={workInfo.fax}
              onChange={(e) => workField("fax", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Web page
            <input
              maxLength={127}
              value={workInfo.web_page}
              onChange={(e) => workField("web_page", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Notes</h2>
        <textarea
          maxLength={450}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Interests</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Interest 1 code
            <input
              type="number"
              value={interests.code1}
              onChange={(e) => interestField("code1", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 1 keyword
            <input
              maxLength={64}
              value={interests.keyword1}
              onChange={(e) => interestField("keyword1", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 2 code
            <input
              type="number"
              value={interests.code2}
              onChange={(e) => interestField("code2", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 2 keyword
            <input
              maxLength={64}
              value={interests.keyword2}
              onChange={(e) => interestField("keyword2", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 3 code
            <input
              type="number"
              value={interests.code3}
              onChange={(e) => interestField("code3", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 3 keyword
            <input
              maxLength={64}
              value={interests.keyword3}
              onChange={(e) => interestField("keyword3", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 4 code
            <input
              type="number"
              value={interests.code4}
              onChange={(e) => interestField("code4", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 4 keyword
            <input
              maxLength={64}
              value={interests.keyword4}
              onChange={(e) => interestField("keyword4", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Affiliations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Past affiliation 1 code
            <input
              type="number"
              value={affiliations.past_code1}
              onChange={(e) => affiliationField("past_code1", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 1 keyword
            <input
              maxLength={64}
              value={affiliations.past_keyword1}
              onChange={(e) => affiliationField("past_keyword1", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 2 code
            <input
              type="number"
              value={affiliations.past_code2}
              onChange={(e) => affiliationField("past_code2", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 2 keyword
            <input
              maxLength={64}
              value={affiliations.past_keyword2}
              onChange={(e) => affiliationField("past_keyword2", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 3 code
            <input
              type="number"
              value={affiliations.past_code3}
              onChange={(e) => affiliationField("past_code3", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 3 keyword
            <input
              maxLength={64}
              value={affiliations.past_keyword3}
              onChange={(e) => affiliationField("past_keyword3", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 1 code
            <input
              type="number"
              value={affiliations.current_code1}
              onChange={(e) =>
                affiliationField("current_code1", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 1 keyword
            <input
              maxLength={64}
              value={affiliations.current_keyword1}
              onChange={(e) => affiliationField("current_keyword1", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 2 code
            <input
              type="number"
              value={affiliations.current_code2}
              onChange={(e) =>
                affiliationField("current_code2", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 2 keyword
            <input
              maxLength={64}
              value={affiliations.current_keyword2}
              onChange={(e) => affiliationField("current_keyword2", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 3 code
            <input
              type="number"
              value={affiliations.current_code3}
              onChange={(e) =>
                affiliationField("current_code3", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 3 keyword
            <input
              maxLength={64}
              value={affiliations.current_keyword3}
              onChange={(e) => affiliationField("current_keyword3", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Permissions</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permissions.auth_required}
            onChange={(e) => permissionField("auth_required", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Authorization required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permissions.web_aware}
            onChange={(e) => permissionField("web_aware", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Web aware
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permissions.allow_spam}
            onChange={(e) => permissionField("allow_spam", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Allow spam
        </label>
      </section>

      {error && <p className="text-sm text-aim-danger">{error}</p>}

      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save ICQ profile"}
        </Button>
      </div>
    </form>
  );
}
