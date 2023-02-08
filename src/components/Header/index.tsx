import Navbar from "./Navbar";
import Title from "./Title";

export default function Header() {
  return (
    <header className="flex justify-between bg-black p-4 text-white md:p-6">
      <Title />

      <div className="flex items-center justify-between gap-4 md:flex-row-reverse md:gap-8">
        <Navbar />
      </div>
    </header>
  );
}
