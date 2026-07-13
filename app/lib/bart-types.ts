export const BART_TYPES: { value: number; label: string }[] = [
  { value: 0, label: "buddy_icon_small" },
  { value: 1, label: "buddy_icon" },
  { value: 2, label: "status_str" },
  { value: 3, label: "arrive_sound" },
  { value: 4, label: "rich_text" },
  { value: 5, label: "superbuddy_icon" },
  { value: 6, label: "radio_station" },
  { value: 7, label: "super_icon_trigger" },
  { value: 9, label: "status_text_link" },
  { value: 11, label: "location" },
  { value: 12, label: "buddy_icon_big" },
  { value: 13, label: "status_str_tod" },
  { value: 15, label: "current_av_track" },
  { value: 96, label: "depart_sound" },
  { value: 128, label: "im_background" },
  { value: 129, label: "im_chrome" },
  { value: 130, label: "im_skin" },
  { value: 131, label: "im_sound" },
  { value: 132, label: "badge" },
  { value: 133, label: "badge_url" },
  { value: 134, label: "im_initial_sound" },
  { value: 136, label: "flash_wallpaper" },
  { value: 137, label: "im_chrome_immers" },
  { value: 256, label: "buddylist_background" },
  { value: 257, label: "buddylist_image" },
  { value: 258, label: "buddylist_skin" },
  { value: 1024, label: "emoticon_set" },
  { value: 1026, label: "encr_cert_chain" },
  { value: 1027, label: "sign_cert_chain" },
  { value: 1028, label: "gateway_cert" },
];

const IMAGE_TYPES = new Set([0, 1, 12]);

export function isImageType(type: number): boolean {
  return IMAGE_TYPES.has(type);
}
