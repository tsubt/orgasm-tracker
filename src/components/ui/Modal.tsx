// a generic modal component
type Props = {
  children: React.ReactNode;
  //   isOpen: boolean;
  onClose: () => void;
  header?: React.ReactNode | string;
  footer?: React.ReactNode | string;
};
const Modal = ({ children, onClose, header, footer }: Props) => {
  return (
    <>
      <div
        className="fixed inset-0 z-10 flex h-screen flex-col items-center overflow-y-auto bg-black bg-opacity-50 pt-[20vh]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="z-20 flex max-w-xl flex-col items-stretch justify-center overflow-hidden rounded-lg bg-gray-200 text-center shadow-lg">
          <div className="flex min-h-[2em] w-full items-center justify-center bg-pink-800 py-2 uppercase text-white">
            {header}
          </div>
          <div className="p-4 pb-8 text-black">{children}</div>
          <div className="flex w-full items-center justify-center bg-gray-900 p-4 uppercase text-white">
            {footer}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
