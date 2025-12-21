export default function Guest() {
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-center text-2xl text-gray-900 dark:text-white">
        Welcome to OrgasmTracker
      </p>
      <p className="text-gray-700 dark:text-gray-300">Please sign in to continue.</p>

      <div className="mt-4 flex flex-col gap-4 text-gray-700 dark:text-gray-300 max-w-2xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">About</h3>
        <p>
          A web app for tracking your orgasms. In development, so for now just
          keep track of your &apos;gasms and build up a history. See some basic
          stats, share with others, and more features to cum!
        </p>
      </div>
    </div>
  );
}
