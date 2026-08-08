/**
 * Open/closed state for the mobile nav drawer.
 *
 * `useState` rather than a module-level `ref`: it is Nuxt's SSR-safe shared state, keyed, so
 * the layout and the sidebar read the same value without one importing the other, and the
 * server render starts from a known `false` instead of whatever the previous request left
 * behind.
 *
 * ## Why there are no lifecycle hooks in here
 *
 * This is called from two components — `layouts/default.vue` needs `isOpen` to set `inert` on
 * `<main>`, and `SiteSidebar.vue` owns the button. Putting `onMounted(...)` in the composable
 * would register the Escape listener twice and remove it twice, which happens to work until
 * one of the two callers unmounts first and takes the other's listener with it.
 *
 * So: state and actions here, every effect in `SiteSidebar.vue`, which is the single owner.
 */
export function useNavDrawer() {
  const isOpen = useState('nav-drawer-open', () => false)

  return {
    isOpen,
    open: () => {
      isOpen.value = true
    },
    close: () => {
      isOpen.value = false
    },
    toggle: () => {
      isOpen.value = !isOpen.value
    },
  }
}
