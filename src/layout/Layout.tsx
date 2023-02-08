import Footer from "../components/Footer";
import Header from "../components/Header";

type Props = {
  children: React.ReactNode | React.ReactNode[] | null;
};

export default function Layout({ children }: Props) {
  return (
    <>
      <main className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-pink-700 to-pink-900">
        <Header />
        <div className="flex flex-1 flex-col items-center">{children}</div>
        <Footer />
      </main>
    </>
  );
}
