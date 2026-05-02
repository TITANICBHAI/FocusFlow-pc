import React, { useState } from 'react'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy'
type Tab = 'privacy' | 'terms'

const PRIVACY_SECTIONS = [
  {
    title: '1. No Data Collection',
    body: 'FocusFlow-PC does not collect, transmit, store, or process any personal data on any external server. All data — tasks, settings, focus sessions, stats, and notes — is stored exclusively in a local SQLite database on your device. Nothing ever leaves your machine.',
  },
  {
    title: '2. What We Store Locally',
    body: 'FocusFlow stores the following data locally on your device only: task list and history, focus session logs, settings and preferences, user profile (name, occupation, goals), daily notes, and productivity statistics. This data is never shared with us, third parties, or analytics services.',
  },
  {
    title: '3. No Analytics or Tracking',
    body: 'FocusFlow-PC contains no telemetry, crash reporting SDKs, usage analytics, or advertising SDKs of any kind. We have no visibility into how you use the app, what tasks you create, how long you focus, or what websites you block.',
  },
  {
    title: '4. Browser / Website Activity',
    body: 'The keyword blocker and website blocking features monitor browser window titles and tab URLs locally on your device to enforce your self-configured blocking rules. This monitoring is performed entirely within the app process and is never transmitted anywhere.',
  },
  {
    title: '5. Backup Exports',
    body: 'If you use the Backup & Export feature, the exported JSON file is saved to a location of your choosing on your device. FocusFlow has no access to this file after you save it.',
  },
  {
    title: '6. Open Source & Auditable',
    body: 'The source code for FocusFlow-PC is available at https://github.com/TITANICBHAI/FocusFlow-pc. You can audit every line of code to verify our privacy claims.',
  },
  {
    title: '7. Changes to This Policy',
    body: 'If this privacy policy is ever updated, the new version will be included in the next app release and noted in the changelog. Since we collect no data, any changes will only affect what is documented, not your actual data.',
  },
  {
    title: '8. Contact',
    body: 'For questions about privacy, reach out via the GitHub repository at https://github.com/TITANICBHAI/FocusFlow-pc or through the app\'s listing contact details.',
  },
]

const TERMS_SECTIONS = [
  {
    title: '1. Acceptance',
    body: 'By installing or using FocusFlow-PC you agree to these Terms. If you do not agree, uninstall the app immediately. These Terms may be changed at any time without prior notice. Continued use after any change constitutes your acceptance of the updated Terms.',
  },
  {
    title: '2. What FocusFlow Does',
    body: 'FocusFlow-PC is a personal productivity tool that monitors and enforces self-imposed focus sessions and website restrictions on Windows, macOS, and Linux. All enforcement is performed locally on your device and is subject to OS-level limitations beyond FocusFlow\'s control.',
  },
  {
    title: '3. Your Sole Responsibility',
    body: 'You are solely responsible for all consequences of configuring, enabling, or disabling any blocking session. FocusFlow and TBTechs bear no responsibility for missed communications, missed deadlines, financial losses, or any other outcome arising while any feature is active or inactive. Use of FocusFlow is entirely at your own risk.',
  },
  {
    title: '4. No Warranty',
    body: 'FocusFlow-PC is provided "AS IS" without any warranty of any kind. TBTechs explicitly disclaims any warranty that the app will function correctly on your OS version or hardware configuration. Blocking may fail at any time for any reason, including OS updates or permission changes.',
  },
  {
    title: '5. No Data Collection',
    body: 'FocusFlow-PC does not collect, transmit, or share any personal data, usage statistics, or behavioral information. All data is stored locally on your device and never leaves it.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'To the maximum extent permitted by applicable law, TBTechs, its affiliates, officers, developers, and contributors shall not be liable for any damages of any kind arising out of or related to your use of or inability to use FocusFlow-PC. The aggregate total liability of TBTechs for any and all claims shall not exceed zero (USD $0).',
  },
  {
    title: '7. Changes to These Terms',
    body: 'These Terms may be updated, replaced, or removed at any time without prior notice. Your continued use of FocusFlow-PC after any change constitutes your unconditional acceptance.',
  },
  {
    title: '8. Contact',
    body: 'For questions about these terms, reach out via the GitHub repository or through the app\'s listing contact details. Questions do not alter or waive any provision of these Terms.',
  },
]

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1.5">{title}</p>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{body}</p>
    </div>
  )
}

export default function PrivacyScreen({ navigate }: { navigate: (p: Page) => void }) {
  const [tab, setTab] = useState<Tab>('privacy')

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('settings')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Privacy & Terms</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your data never leaves this device</p>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-2xl mx-auto mb-3">🔒</div>
        <p className="text-base font-bold text-gray-800 dark:text-gray-100">100% Local — No Servers</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All data stays on your device. We have no visibility into your usage.</p>
      </div>

      {/* Tab bar */}
      <div className="px-6 pt-4 pb-0">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          {(['privacy', 'terms'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'privacy' ? '🔒 Privacy Policy' : '📋 Terms of Service'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">Last updated: April 2026</p>

        {tab === 'privacy'
          ? PRIVACY_SECTIONS.map((s, i) => <Section key={i} {...s} />)
          : TERMS_SECTIONS.map((s, i) => <Section key={i} {...s} />)
        }

        <div className="flex gap-2 pt-2">
          <a
            href="https://titanicbhai.github.io/FocusFlow/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-700 text-indigo-500 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            Open online ↗
          </a>
          <a
            href="https://github.com/TITANICBHAI/FocusFlow-pc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Source code ↗
          </a>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-4">
          No analytics. No telemetry. No servers. Ever.
        </p>
      </div>
    </div>
  )
}
