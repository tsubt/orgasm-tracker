"use client";

import { motion, AnimatePresence } from "framer-motion";
import { OrgasmType, SexType } from "@prisma/client";

const OrgasmTypes = Object.keys(OrgasmType).map((x) => {
  return {
    value: x as OrgasmType,
    label: x.charAt(0) + x.slice(1).toLowerCase(),
  };
});

const SexTypes = Object.keys(SexType).map((x) => {
  return {
    value: x as SexType,
    label: x.charAt(0) + x.slice(1).toLowerCase(),
  };
});

export default function OrgasmDialog({
  isOpen,
  errorMessage,
  onSubmit,
  onClose,
  dateRef,
  timeRef,
  noteRef,
  type,
  setType,
  sex,
  setSex,
  defaultDate,
  defaultTime,
}: {
  isOpen: boolean;
  errorMessage: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  dateRef: React.RefObject<HTMLInputElement | null>;
  timeRef: React.RefObject<HTMLInputElement | null>;
  noteRef: React.RefObject<HTMLTextAreaElement | null>;
  type: OrgasmType;
  setType: (value: OrgasmType) => void;
  sex: SexType;
  setSex: (value: SexType) => void;
  defaultDate: string;
  defaultTime: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold text-black">
              When did you have this orgasm?
            </h4>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 lg:grid lg:grid-flow-col lg:grid-rows-2 lg:items-center lg:gap-x-8">
                <label
                  htmlFor="orgasmDate"
                  className="text-sm font-bold uppercase"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="orgasmDate"
                  ref={dateRef}
                  defaultValue={defaultDate}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />

                <label
                  htmlFor="orgasmTime"
                  className="text-sm font-bold uppercase"
                >
                  Time
                </label>
                <input
                  type="time"
                  id="orgasmTime"
                  min="00:00:00"
                  max="24:00:00"
                  pattern="[0-9]{2}:[0-9]{2}"
                  ref={timeRef}
                  defaultValue={defaultTime}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 lg:grid lg:grid-flow-col lg:grid-rows-2 lg:items-center lg:gap-x-8">
                <label
                  htmlFor="orgasmType"
                  className="text-sm font-bold uppercase"
                >
                  Orgasm Type
                </label>
                <select
                  name="orgasmType"
                  id="orgasmType"
                  className="border border-gray-300 bg-white p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={type}
                  onChange={(e) => setType(e.target.value as OrgasmType)}
                >
                  {OrgasmTypes.map((orgasmType) => (
                    <option key={orgasmType.value} value={orgasmType.value}>
                      {orgasmType.label}
                    </option>
                  ))}
                </select>

                <label
                  htmlFor="sexType"
                  className="text-sm font-bold uppercase"
                >
                  Sex Partner?
                </label>
                <select
                  name="sexType"
                  id="sexType"
                  className="border border-gray-300 bg-white p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as SexType)}
                >
                  {SexTypes.map((sexType) => (
                    <option key={sexType.value} value={sexType.value}>
                      {sexType.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="orgasmNote"
                  className="text-sm font-bold uppercase"
                >
                  Notes
                </label>
                <textarea
                  name="orgasmNote"
                  id="orgasmNote"
                  className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  placeholder="Details you'd like to remember"
                  ref={noteRef}
                  rows={4}
                />
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
                >
                  ✗ {errorMessage}
                </motion.div>
              )}

              <div className="mt-2 flex justify-between border-t pt-4 -mx-6 px-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded hover:bg-pink-600 dark:hover:bg-pink-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
