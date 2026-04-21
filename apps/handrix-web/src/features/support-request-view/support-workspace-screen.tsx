import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type {
  InternalSession,
  InternalSupportSession,
  SupportRequestSearchResponse,
  SupportRequestSearchResult,
} from '@handrix/shared-contracts'
import { loadSupportProtectedSession, SupportAuthError } from './support-auth-api'
import { searchSupportRequests } from './support-search-api'

type SupportWorkspaceScreenProps = {
  session: InternalSession
  onLogout: () => void
  onOpenRequest: (publicId: string) => void
  onSessionExpired: (reason?: { message: string; recoveryHint?: string | null }) => void
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function SearchResultCard({
  item,
  onOpenRequest,
}: {
  item: SupportRequestSearchResult
  onOpenRequest: (publicId: string) => void
}) {
  return (
    <article className="ops-queue-item">
      <div className="ops-queue-item__header">
        <p className="ops-queue-item__cue">{item.currentPublicStatusLabel}</p>
        <p className="ops-queue-item__state">
          {item.currentInternalLifecycleLabel}
        </p>
      </div>

      <div className="ops-queue-item__body">
        <div className="ops-queue-item__identity">
          <h3>{item.issueLabel}</h3>
          <p>{item.addressSummary}</p>
        </div>

        <div className="ops-queue-item__meta">
          <p>
            <strong>Request ID:</strong> {item.publicId}
          </p>
          <p>
            <strong>Public status:</strong> {item.currentPublicStatusLabel}
          </p>
          <p>
            <strong>Internal lifecycle:</strong>{' '}
            {item.currentInternalLifecycleLabel}
          </p>
          <p>
            <strong>Received:</strong>{' '}
            <time dateTime={item.receivedAt}>
              {formatTimestamp(item.receivedAt)}
            </time>
          </p>
          <p>
            <strong>Latest update:</strong>{' '}
            <time dateTime={item.lastUpdatedAt}>
              {formatTimestamp(item.lastUpdatedAt)}
            </time>
          </p>
          {item.currentAssignmentOwnerLabel ? (
            <p>
              <strong>Owner:</strong> {item.currentAssignmentOwnerLabel}
            </p>
          ) : null}
          {item.interventionLabel ? (
            <p>
              <strong>Intervention:</strong> {item.interventionLabel}
            </p>
          ) : null}
        </div>
      </div>

      <p className="ops-queue-item__detail">
        {item.currentInternalLifecycleDetail}
      </p>
      <p className="ops-queue-item__summary">{item.latestChangeSummary}</p>

      <button
        type="button"
        className="secondary-button ops-queue-item__open"
        onClick={() => onOpenRequest(item.publicId)}
      >
        Open request
      </button>
    </article>
  )
}

export function SupportWorkspaceScreen({
  session,
  onLogout,
  onOpenRequest,
  onSessionExpired,
}: SupportWorkspaceScreenProps) {
  const [protectedSession, setProtectedSession] = useState<InternalSupportSession | null>(null)
  const [sessionErrorMessage, setSessionErrorMessage] = useState<string | null>(null)
  const [activeToken, setActiveToken] = useState(session.accessToken)
  const [queryInput, setQueryInput] = useState('')
  const [searchResult, setSearchResult] = useState<SupportRequestSearchResponse | null>(null)
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null)
  const [searchRecoveryHint, setSearchRecoveryHint] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  if (activeToken !== session.accessToken) {
    setActiveToken(session.accessToken)
    setProtectedSession(null)
    setSessionErrorMessage(null)
    setSearchResult(null)
    setHasSearched(false)
  }

  const handleSessionExpired = useCallback(
    (error: SupportAuthError) => {
      onSessionExpired({
        message: error.message,
        recoveryHint: error.recoveryHint ?? null,
      })
    },
    [onSessionExpired],
  )

  useEffect(() => {
    const abortController = new AbortController()

    async function verifyProtectedSession() {
      try {
        const result = await loadSupportProtectedSession(
          session.accessToken,
          abortController.signal,
        )

        setProtectedSession(result)
        setSessionErrorMessage(null)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof SupportAuthError) {
          handleSessionExpired(error)
          return
        }

        setSessionErrorMessage('We could not verify that protected session right now.')
      }
    }

    void verifyProtectedSession()

    return () => abortController.abort()
  }, [handleSessionExpired, session.accessToken])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = queryInput.trim()
    setIsSubmitting(true)
    setSearchErrorMessage(null)
    setSearchRecoveryHint(null)

    try {
      const nextResult = await searchSupportRequests(session.accessToken, {
        q: trimmed,
        limit: 25,
      })
      setSearchResult(nextResult)
      setHasSearched(true)
    } catch (error) {
      if (error instanceof SupportAuthError) {
        if (
          error.code === 'INTERNAL_AUTH_REQUIRED' ||
          error.code === 'INTERNAL_AUTH_FORBIDDEN' ||
          error.code === 'INTERNAL_AUTH_INVALID'
        ) {
          handleSessionExpired(error)
          return
        }

        setSearchErrorMessage(error.message)
        setSearchRecoveryHint(error.recoveryHint ?? null)
        return
      }

      setSearchErrorMessage('We could not run that support search right now.')
      setSearchRecoveryHint('Try a different search term in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell ops-page">
      <section className="ops-hero panel ops-hero--queue">
        <p className="eyebrow">Handrix Internal</p>
        <div className="hero-heading-row">
          <h1 className="hero-title hero-title--wide">Support workspace</h1>
        </div>
        <p className="lede">
          Search, review, and intervene on customer requests from the protected
          support workspace.
        </p>
      </section>

      <section className="panel ops-login-panel">
        {protectedSession ? (
          <div className="ops-login-panel__copy">
            <p className="ops-kicker">Access verified</p>
            <h2>{protectedSession.message}</h2>
            <p className="helper-copy">
              Signed in as {protectedSession.user.displayName} (
              {protectedSession.user.role}).
            </p>

            <form className="ops-field" onSubmit={handleSubmit}>
              <label className="ops-field" htmlFor="support-search-input">
                <span>Search support requests</span>
                <input
                  id="support-search-input"
                  className="ops-input"
                  type="search"
                  autoComplete="off"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="Request id, issue, address, city, or postal code"
                />
              </label>
              <p className="helper-copy">
                Search by request id, issue, address, city, or postal code.
              </p>
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Searching…' : 'Search requests'}
              </button>
            </form>

            <button className="secondary-button" onClick={onLogout} type="button">
              Sign out
            </button>

            {searchErrorMessage ? (
              <div className="ops-alert" role="alert">
                <strong>{searchErrorMessage}</strong>
                {searchRecoveryHint ? <p>{searchRecoveryHint}</p> : null}
              </div>
            ) : null}

            {!hasSearched ? (
              <div className="ops-session-card">
                <p className="ops-kicker">Search support requests</p>
                <h3>Start by entering something you know about the request.</h3>
                <p className="helper-copy">
                  Try a request id, issue label, street address, city, or postal
                  code. Results stay in this workspace until you run another
                  search.
                </p>
              </div>
            ) : null}

            {hasSearched && searchResult && searchResult.items.length === 0 ? (
              <div className="ops-session-card" aria-live="polite">
                <p className="ops-kicker">No matches found</p>
                <h3>We could not find a request matching that search.</h3>
                <p className="helper-copy">
                  Try a different request id, address, or issue label.
                </p>
              </div>
            ) : null}

            {searchResult && searchResult.items.length > 0 ? (
              <>
                {searchResult.summary.limitReached ? (
                  <p className="helper-copy">
                    Showing {searchResult.items.length} of{' '}
                    {searchResult.summary.totalMatched} results — refine your
                    search to narrow these down.
                  </p>
                ) : null}
                <ol
                  className="ops-queue-list"
                  aria-label="Matching support requests"
                >
                  {searchResult.items.map((item) => (
                    <li key={item.publicId}>
                      <SearchResultCard
                        item={item}
                        onOpenRequest={onOpenRequest}
                      />
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>
        ) : sessionErrorMessage ? (
          <div className="ops-alert" role="alert">
            <strong>{sessionErrorMessage}</strong>
          </div>
        ) : (
          <p className="helper-copy">Verifying your support session…</p>
        )}
      </section>
    </main>
  )
}
