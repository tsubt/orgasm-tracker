export default function DocsPage() {
  return (
    <div className="w-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Documentation
        </h1>

        <div className="flex flex-col gap-8 text-gray-700 dark:text-gray-300">
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Getting Started
            </h2>
            <p>
              Welcome to OrgasmTracker! This web app helps you track your orgasms
              and build up a personal history. Sign in with your Google account
              to get started.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Tracking Orgasms
            </h2>
            <p>
              The main feature of OrgasmTracker is recording your orgasms. You
              can add an orgasm entry with the following information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Type:</strong> Choose from Full, Ruined, Hands-free, or
                Anal
              </li>
              <li>
                <strong>Sex Type:</strong> Solo, Virtual, or Physical
              </li>
              <li>
                <strong>Date and Time:</strong> When the orgasm occurred
              </li>
            </ul>
            <p>
              You can add orgasms from the sidebar button or from the main
              dashboard. All your entries are saved and can be viewed in your
              Orgasms list.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Tracking Chastity Sessions
            </h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ Important
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Chastity tracking must be enabled in your Settings page before you
                can use this feature. Go to Settings and check the &quot;Track
                chastity status&quot; option.
              </p>
            </div>
            <p>
              OrgasmTracker now includes chastity session tracking. You can record
              periods when you&apos;re locked and track your chastity history:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Start Time:</strong> When the session began (required)
              </li>
              <li>
                <strong>End Time:</strong> When the session ended (optional - leave
                blank for active sessions)
              </li>
              <li>
                <strong>Notes:</strong> Optional details about the session
              </li>
            </ul>
            <p>
              You can access the Chastity page from the sidebar to view all your
              sessions in a table format. The table shows start time, end time,
              duration, and notes. You can edit or delete any session. Active
              sessions (without an end time) are marked as &quot;Active&quot; and
              show the current duration.
            </p>
            <p>
              If you have chastity tracking enabled, you&apos;ll also see your
              current chastity status on the dashboard, showing whether you&apos;re
              currently locked or unlocked, and how long you&apos;ve been in your
              current state.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h2>
            <p>
              Your dashboard shows comprehensive statistics and visualizations
              of your orgasm history:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Summary Stats:</strong> View totals, averages, and
                streaks
              </li>
              <li>
                <strong>Charts:</strong> Visualize your data with line charts,
                heatmaps, and timeline views
              </li>
              <li>
                <strong>Time Filters:</strong> Filter your stats by different
                time periods (All, Today, This Week, This Month, This Year)
              </li>
              <li>
                <strong>Period Views:</strong> View charts by Year, Month, Week,
                or Day
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Managing Your Data
            </h2>
            <p>
              The Orgasms page allows you to view and manage all your recorded
              orgasms. You can see your complete history in a table format,
              making it easy to review and track your progress over time.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              User Profiles
            </h2>
            <p>
              Each user can have a public profile with a customizable bio. You
              can control your privacy settings:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Public Profile:</strong> Make your profile visible to
                other users
              </li>
              <li>
                <strong>Public Orgasms:</strong> Share your orgasm data
                publicly
              </li>
              <li>
                <strong>Username:</strong> Set a custom username for your
                profile URL
              </li>
            </ul>
            <p>
              Visit your profile page to see your public profile and edit your
              bio.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Exploring Other Users
            </h2>
            <p>
              The Users page shows all users who have made their profiles
              public. You can browse other users&apos; profiles and see their
              public statistics if they&apos;ve enabled public orgasms.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Settings
            </h2>
            <p>
              In the Settings page, you can manage your account preferences:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Change your username</li>
              <li>Toggle public profile visibility</li>
              <li>Toggle public orgasms visibility</li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Privacy & Data
            </h2>
            <p>
              Your data is private by default. You have full control over what
              information is shared publicly. Only enable public profile or
              public orgasms if you want to share your data with other users.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
