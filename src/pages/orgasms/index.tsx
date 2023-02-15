import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import type { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import Head from "next/head";
import { useMemo, useState } from "react";
import { Column, useTable } from "react-table";
import { Modal } from "../../components/ui";
import { trpc } from "../../utils/trpc";

export default function OrgasmsPage() {
  const { data: orgasms, isLoading: loadingOrgasms } =
    trpc.orgasms.get.useQuery();

  return (
    <>
      <Head>
        <title>OrgasmTracker | Manage Orgasms</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Manage your Orgasms
        </h2>

        <div className="mx-8 flex w-full max-w-4xl flex-col bg-gray-200">
          {loadingOrgasms ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-lg text-gray-500">Loading orgasms...</p>
            </div>
          ) : orgasms ? (
            <OrgasmTable orgasms={orgasms} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-lg text-gray-500">No orgasms to show (yet).</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const OrgasmTable = ({ orgasms }: { orgasms: Orgasm[] }) => {
  const context = trpc.useContext();
  const mutateOrgasm = trpc.orgasms.edit.useMutation({
    onSuccess: () => {
      setEditOrgasm(null);
      context.orgasms.get.invalidate();
    },
  });
  const deleteOrgasm = trpc.orgasms.delete.useMutation({
    onSuccess: () => {
      setDeleteOrgasmConfirm(null);
      context.orgasms.get.invalidate();
    },
  });

  const [editOrgasm, setEditOrgasm] = useState<Orgasm | null>(null);
  const [deleteOrgasmConfirm, setDeleteOrgasmConfirm] =
    useState<Orgasm | null>();

  const columns = useMemo<Column<Orgasm>[]>(
    () => [
      {
        Header: "Date",
        accessor: (row: Orgasm) =>
          dayjs(row.date + " " + row.time).format("DD MMM YYYY @ HH:mm"),
      },
      // {
      //   Header: "Type",
      //   accessor: "typeId",
      // },
      {
        Header: "Note",
        accessor: "note",
      },
      {
        Header: "Actions",
        accessor: (row: Orgasm) => (
          <div className="flex flex-row items-center gap-2">
            <PencilSquareIcon
              className="h-5 w-5 cursor-pointer text-gray-500"
              onClick={() => setEditOrgasm(row)}
            />
            <TrashIcon
              className="h-5 w-5 cursor-pointer text-gray-500"
              onClick={() => setDeleteOrgasmConfirm(row)}
            />
          </div>
        ),
      },
    ],
    []
  );

  const tableInstance = useTable({ columns, data: orgasms });
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    tableInstance;

  return (
    <>
      <table {...getTableProps()} className="w-full">
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  {...column.getHeaderProps()}
                  className="bg-pink-900 px-4 py-2 text-left text-pink-100"
                >
                  {column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <td
                      {...cell.getCellProps()}
                      className="border-t border-gray-200 px-4 py-2 text-sm"
                    >
                      {cell.render("Cell")}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {editOrgasm && (
        <Modal
          onClose={() => setEditOrgasm(null)}
          header={"Edit orgasm"}
          footer={
            <div className="flex w-full items-center justify-end gap-4">
              <button
                className="rounded bg-pink-600 py-1 px-2 font-bold text-white hover:bg-red-700"
                onClick={() => {
                  mutateOrgasm.mutateAsync({
                    id: editOrgasm.id,
                    // type: editOrgasm.type,
                    note: editOrgasm.note,
                    date: editOrgasm.date,
                    time: editOrgasm.time,
                  });
                }}
              >
                {mutateOrgasm.isLoading ? <>Saving ...</> : <>Save changes</>}
              </button>
              <button
                className="rounded bg-gray-200 py-1 px-2 font-bold text-gray-500 hover:bg-gray-300"
                onClick={() => setEditOrgasm(null)}
              >
                Cancel
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 items-center justify-center gap-4 md:grid-cols-2">
            <div className="flex w-full flex-col">
              {/* Date */}
              <label
                htmlFor="date"
                className="text-left text-sm font-bold text-gray-500"
              >
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={editOrgasm.date}
                onChange={(e) =>
                  setEditOrgasm((prev) =>
                    prev
                      ? {
                          ...prev,
                          date: e.target.value,
                        }
                      : null
                  )
                }
                className="w-full rounded border border-gray-300 px-4 py-2"
              />
            </div>
            <div className="flex w-full flex-col">
              {/* Time */}
              <label
                htmlFor="time"
                className="text-left text-sm font-bold text-gray-500"
              >
                Time
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={editOrgasm.time}
                onChange={(e) =>
                  setEditOrgasm((prev) =>
                    prev
                      ? {
                          ...prev,
                          time: e.target.value,
                        }
                      : null
                  )
                }
                className="w-full rounded border border-gray-300 px-4 py-2"
              />
            </div>
            <div className="flex w-full flex-col">{/* Type */}</div>
            <div className="flex w-full flex-col md:col-span-2">
              {/* Note */}
              <label
                htmlFor="note"
                className="text-left text-sm font-bold text-gray-500"
              >
                Note
              </label>
              <textarea
                id="note"
                name="note"
                value={editOrgasm.note || ""}
                onChange={(e) =>
                  setEditOrgasm((prev) =>
                    prev
                      ? {
                          ...prev,
                          note: e.target.value,
                        }
                      : null
                  )
                }
                className="w-full rounded border border-gray-300 px-4 py-2"
              />
            </div>
          </div>
        </Modal>
      )}

      {deleteOrgasmConfirm && (
        <Modal
          onClose={() => setDeleteOrgasmConfirm(null)}
          header={"Confirm orgasm deletion"}
          footer={
            <div className="flex w-full items-center justify-end gap-4">
              <button
                className="rounded bg-pink-600 py-1 px-2 font-bold text-white hover:bg-red-700"
                onClick={() => {
                  deleteOrgasm.mutateAsync({ id: deleteOrgasmConfirm.id });
                }}
              >
                {deleteOrgasm.isLoading ? (
                  <>Deleting ...</>
                ) : (
                  <>Yes, delete my orgasm!</>
                )}
              </button>
              <button
                className="rounded bg-gray-200 py-1 px-2 font-bold text-gray-500 hover:bg-gray-300"
                onClick={() => setDeleteOrgasmConfirm(null)}
              >
                Cancel
              </button>
            </div>
          }
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="">
              You are about to permanently delete this orgasm. This cannot be
              undone.
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {dayjs(
                deleteOrgasmConfirm.date + " " + deleteOrgasmConfirm.time
              ).format("HH:mm:ss DD MMM YYYY")}
            </p>
            <p className="italic">{deleteOrgasmConfirm.note}</p>
          </div>
        </Modal>
      )}
    </>
  );
};
