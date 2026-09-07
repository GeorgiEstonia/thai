import SettingsTabs from './SettingsTabs'

export default function SettingsLayout({ children }: LayoutProps<'/settings'>) {
  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <SettingsTabs />
      {children}
    </main>
  )
}
