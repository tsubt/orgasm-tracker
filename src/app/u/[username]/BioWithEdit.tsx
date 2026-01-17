"use client";

import { useRef, useEffect } from "react";
import BioEditor, { BioEditorRef } from "./BioEditor";
import { setGlobalEditTrigger } from "./EditBioButton";

interface BioWithEditProps {
  initialBio: string | null;
  isOwnProfile: boolean;
}

export default function BioWithEdit({
  initialBio,
  isOwnProfile,
}: BioWithEditProps) {
  const bioEditorRef = useRef<BioEditorRef>(null);

  useEffect(() => {
    if (isOwnProfile) {
      setGlobalEditTrigger(() => {
        bioEditorRef.current?.triggerEdit();
      });
    }
    return () => {
      setGlobalEditTrigger(null);
    };
  }, [isOwnProfile]);

  return (
    <div className="mt-2">
      <BioEditor ref={bioEditorRef} initialBio={initialBio} isOwnProfile={isOwnProfile} />
    </div>
  );
}
