export default defineNuxtPlugin(async () => {
  const { refresh, loaded } = useAuth()
  if (!loaded.value) {
    await refresh()
  }
})
