import UsersList from "./UsersList";

export default function UsersPage() {
  return (
    <div className="w-full p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Public Users
        </h2>
        <UsersList />
      </div>
    </div>
  );
}
