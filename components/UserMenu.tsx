"use client";

import { signOut } from "next-auth/react";

type UserMenuProps = {
  email: string;
};

export default function UserMenu({ email }: UserMenuProps) {
  return (
    <div className="user-menu">
      <div>
        <p className="eyebrow">Signed in as</p>
        <strong>{email}</strong>
      </div>
      <button type="button" className="ghost-button" onClick={() => signOut({ callbackUrl: "/" })}>
        Sign out
      </button>
    </div>
  );
}
