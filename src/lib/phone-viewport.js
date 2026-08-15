export const PHONE_MEDIA_QUERY = '(max-width: 767px)'

export function isPhoneViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(PHONE_MEDIA_QUERY).matches
}
