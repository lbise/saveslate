import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, GitCommitHorizontal, Sparkles } from 'lucide-react';

import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useOnboarding } from '../hooks/useOnboarding';
import { useUser } from '../hooks/useUser';
import {
  fetchReleaseManifest,
  formatReleaseDate,
  getLastSeenRelease,
  isPublishedRelease,
  markReleaseSeen,
} from '../lib/release-notes';
import { ReleaseNotesContext } from './release-notes-context';

import type { ReactNode } from 'react';
import type { ReleaseManifest } from '../lib/release-notes';

const RELEASE_POLL_INTERVAL_MS = 5 * 60 * 1000;

interface ReleaseNotesProviderProps {
  children: ReactNode;
}

export function ReleaseNotesProvider({ children }: ReleaseNotesProviderProps) {
  const { user } = useUser();
  const { isOnboardingComplete } = useOnboarding();
  const [release, setRelease] = useState<ReleaseManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedReleaseId, setDismissedReleaseId] = useState<string | null>(null);
  const [manuallyOpenedReleaseId, setManuallyOpenedReleaseId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function checkForRelease() {
      try {
        const nextRelease = await fetchReleaseManifest(controller.signal);
        if (!controller.signal.aborted && nextRelease) {
          setRelease((current) =>
            current?.id === nextRelease.id ? current : nextRelease,
          );
        }
      } catch {
        // Release notifications should never block the application shell.
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void checkForRelease();
      }
    }

    void checkForRelease();
    const intervalId = window.setInterval(
      () => void checkForRelease(),
      RELEASE_POLL_INTERVAL_MS,
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isAutomaticallyOpen = isPublishedRelease(release)
    && isOnboardingComplete
    && dismissedReleaseId !== release.id
    && getLastSeenRelease(user.id) !== release.id;
  const isManuallyOpen = release !== null
    && manuallyOpenedReleaseId === release.id;
  const isDialogOpen = isAutomaticallyOpen || isManuallyOpen;

  const openReleaseNotes = useCallback(() => {
    if (release) {
      setManuallyOpenedReleaseId(release.id);
    }
  }, [release]);

  const closeReleaseNotes = useCallback(() => {
    if (release) {
      markReleaseSeen(user.id, release.id);
      setDismissedReleaseId(release.id);
    }
    setManuallyOpenedReleaseId(null);
  }, [release, user.id]);

  const value = useMemo(() => ({
    release,
    isLoading,
    openReleaseNotes,
  }), [isLoading, openReleaseNotes, release]);

  return (
    <ReleaseNotesContext.Provider value={value}>
      {children}
      {release && (
        <ReleaseNotesDialog
          open={isDialogOpen}
          release={release}
          onClose={closeReleaseNotes}
        />
      )}
    </ReleaseNotesContext.Provider>
  );
}

interface ReleaseNotesDialogProps {
  open: boolean;
  release: ReleaseManifest;
  onClose: () => void;
}

function ReleaseNotesDialog({ open, release, onClose }: ReleaseNotesDialogProps) {
  const releaseDate = formatReleaseDate(release.releasedAt);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
            <Sparkles />
          </div>
          <DialogTitle>What&apos;s new in SaveSlate</DialogTitle>
          <DialogDescription>
            Build {release.version}{releaseDate ? ` · Released ${releaseDate}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <h3 className="font-display text-sm font-medium text-foreground">
              Changes in this deployment
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              These updates were deployed since the previous version.
            </p>
          </div>

          {release.commits.length > 0 ? (
            <ul className="flex flex-col gap-2" aria-label="Released commits">
              {release.commits.map((commit) => (
                <li key={commit.sha}>
                  <ReleaseCommitLink commit={commit} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
              This deployment does not include a commit summary.
            </p>
          )}
        </div>

        <DialogFooter>
          {release.compareUrl && (
            <Button variant="outline" asChild>
              <a
                href={release.compareUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View all changes
                <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          )}
          <Button type="button" onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReleaseCommitLinkProps {
  commit: ReleaseManifest['commits'][number];
}

function ReleaseCommitLink({ commit }: ReleaseCommitLinkProps) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <GitCommitHorizontal />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-5 text-foreground">
          {commit.title}
        </span>
        <span className="mt-0.5 block text-xs text-dimmed">
          {commit.sha.slice(0, 7)}{commit.author ? ` · ${commit.author}` : ''}
        </span>
      </span>
      {commit.url && <ExternalLink className="shrink-0 text-dimmed" />}
    </>
  );

  const className = 'flex min-h-14 items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left no-underline transition-colors hover:border-dimmed hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring';

  if (!commit.url) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a
      href={commit.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  );
}
