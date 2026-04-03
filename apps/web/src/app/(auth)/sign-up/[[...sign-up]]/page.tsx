'use client';

import { useState } from 'react';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 w-full">

      {/* ── Agreement checkbox ────────────────────────────────────────── */}
      <div className="w-full max-w-[400px]">
        <label
          className={[
            'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
            agreed
              ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-primary/10'
              : touched
              ? 'border-destructive bg-destructive/5'
              : 'border-border bg-card hover:border-[#0F6E56]/50',
          ].join(' ')}
        >
          {/* Checkbox */}
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setTouched(true);
              }}
              className="sr-only"
            />
            <div
              className={[
                'w-5 h-5 rounded flex items-center justify-center border-2 transition-all',
                agreed
                  ? 'bg-[#0F6E56] border-[#0F6E56]'
                  : 'bg-background border-border',
              ].join(' ')}
            >
              {agreed && (
                <svg
                  viewBox="0 0 12 12"
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </div>
          </div>

          {/* Label text */}
          <span className="text-sm text-foreground leading-relaxed">
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#0F6E56] underline underline-offset-2 hover:text-[#085041]"
            >
              Terms of Service
            </a>
            ,{' '}
            <a
              href="/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#0F6E56] underline underline-offset-2 hover:text-[#085041]"
            >
              Terms of Use
            </a>
            ,{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#0F6E56] underline underline-offset-2 hover:text-[#085041]"
            >
              Privacy Policy
            </a>
            , and{' '}
            <a
              href="/cookies"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#0F6E56] underline underline-offset-2 hover:text-[#085041]"
            >
              Cookie Policy
            </a>
            .
          </span>
        </label>

        {/* Validation message */}
        {touched && !agreed && (
          <p className="mt-1.5 text-xs text-destructive px-1">
            You must agree to the terms before creating an account.
          </p>
        )}
      </div>

      {/* ── Clerk SignUp — only mounts after checkbox is checked ──────── */}
      {agreed ? (
        <SignUp />
      ) : (
        <div
          className="w-full max-w-[400px]"
          onClick={() => setTouched(true)}
        >
          {/* Disabled placeholder that mimics the Clerk card */}
          <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-8 flex flex-col items-center gap-3 cursor-not-allowed select-none">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <svg
                viewBox="0 0 20 20"
                className="w-4 h-4 text-muted-foreground"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Agree to the terms above to continue
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Sign-up form will appear once you accept
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
