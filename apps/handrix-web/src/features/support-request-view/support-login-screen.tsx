import { useState } from 'react'
import type { FormEvent } from 'react'
import type { InternalSession } from '@handrix/shared-contracts'
import { createInternalSession, SupportAuthError } from './support-auth-api'

type SupportLoginScreenProps = {
  onAuthenticated: (session: InternalSession) => void
  initialErrorMessage?: string | null
  initialRecoveryHint?: string | null
}

export function SupportLoginScreen({
  onAuthenticated,
  initialErrorMessage = null,
  initialRecoveryHint = null,
}: SupportLoginScreenProps) {
  const [email, setEmail] = useState('support@handrix.local')
  const [password, setPassword] = useState('support-demo-pass')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage)
  const [recoveryHint, setRecoveryHint] = useState<string | null>(initialRecoveryHint)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setRecoveryHint(null)

    try {
      const session = await createInternalSession({
        email,
        password,
      })

      onAuthenticated(session)
    } catch (error) {
      if (error instanceof SupportAuthError) {
        setErrorMessage(error.message)
        setRecoveryHint(error.recoveryHint ?? null)
      } else {
        setErrorMessage('We could not start that staff session right now.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell ops-page">
      <section className="ops-hero panel">
        <p className="eyebrow">Handrix Internal</p>
        <div className="hero-heading-row">
          <h1 className="hero-title hero-title--wide">Support access</h1>
        </div>
        <p className="lede">
          Use an authorized staff account to enter the protected support workspace.
        </p>
      </section>

      <section className="panel ops-login-panel">
        <div className="ops-login-panel__copy">
          <p className="ops-kicker">Protected sign-in</p>
          <h2>Staff authentication</h2>
          <p className="helper-copy">
            This area is reserved for internal support staff. Customer request data does not
            load here until the backend verifies your signed session.
          </p>
        </div>

        <form className="ops-login-form" onSubmit={handleSubmit}>
          <label className="ops-field">
            <span>Email</span>
            <input
              autoComplete="username"
              className="ops-input"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="ops-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              className="ops-input"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? (
            <div className="ops-alert" role="alert">
              <strong>{errorMessage}</strong>
              {recoveryHint ? <p>{recoveryHint}</p> : null}
            </div>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in…' : 'Enter support workspace'}
          </button>
        </form>
      </section>
    </main>
  )
}
