"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { deleteAccount } from "./actions";

const CONFIRMATION_TEXT = "Delete all of my data";

export default function DeleteAccount() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmationText === CONFIRMATION_TEXT;

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    const toastId = toast.loading("Deleting your account...");

    try {
      await deleteAccount();
      toast.success("Account deleted successfully", { id: toastId });

      // Redirect to signout endpoint, which will then redirect to home
      window.location.href = "/api/auth/signout";
    } catch (error) {
      toast.error("Failed to delete account", { id: toastId });
      console.error(error);
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setConfirmationText("");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md font-semibold hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
      >
        Delete Account
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) {
                handleClose();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-6 rounded-lg bg-white dark:bg-gray-800 p-6 text-black dark:text-white shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-red-600 dark:text-red-500">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  This action cannot be undone. This will permanently delete:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 ml-2">
                  <li>All of your orgasms</li>
                  <li>Your user profile information</li>
                  <li>All associated data</li>
                </ul>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  If you prefer to keep your data but make it private, you can
                  make your profile private in the settings above instead.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="confirmation"
                  className="text-sm font-semibold text-gray-900 dark:text-white"
                >
                  Type &quot;{CONFIRMATION_TEXT}&quot; to confirm:
                </label>
                <input
                  type="text"
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  disabled={isDeleting}
                  placeholder={CONFIRMATION_TEXT}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 px-3 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-md font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!isConfirmed || isDeleting}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md font-semibold hover:bg-red-700 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
