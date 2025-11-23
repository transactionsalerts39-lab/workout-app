import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { useProgramContext } from '../../../context/ProgramContext'
import type { ClientIntakeRecord, ClientIntakeSubmission } from '../../../types/program'

export interface IntakeFormValues {
  basic: {
    fullName: string
    email: string
    phone: string
  }
  goals: {
    primaryGoal: string
    secondaryGoal: string
    notes: string
  }
  background: {
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | ''
    equipmentAccess: string
    injuries: string
  }
  availability: {
    preferredDays: string
    preferredTimes: string
    timezone: string
  }
}

export interface IntakeFormErrors {
  basic?: {
    fullName?: string
    email?: string
  }
  availability?: {
    timezone?: string
  }
}

const EMPTY_VALUES: IntakeFormValues = {
  basic: {
    fullName: '',
    email: '',
    phone: '',
  },
  goals: {
    primaryGoal: '',
    secondaryGoal: '',
    notes: '',
  },
  background: {
    experienceLevel: '',
    equipmentAccess: '',
    injuries: '',
  },
  availability: {
    preferredDays: '',
    preferredTimes: '',
    timezone: '',
  },
}

interface IntakeFormProps {
  clientId?: string
  onSuccess?: (record: ClientIntakeRecord) => void
  onCancel?: () => void
  className?: string
}

const EXPERIENCE_OPTIONS: IntakeFormValues['background']['experienceLevel'][] = ['beginner', 'intermediate', 'advanced']

export function IntakeForm({ clientId, onSuccess, onCancel, className }: IntakeFormProps) {
  const { saveClientIntake } = useProgramContext()
  const [values, setValues] = useState<IntakeFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<IntakeFormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const emailValid = useMemo(() => {
    if (!values.basic.email) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.basic.email)
  }, [values.basic.email])

  const timezoneValid = useMemo(() => {
    if (!values.availability.timezone) return true
    return /\w+\/\w+/.test(values.availability.timezone)
  }, [values.availability.timezone])

  const validate = (): boolean => {
    const nextErrors: IntakeFormErrors = {}

    if (!values.basic.fullName.trim()) {
      nextErrors.basic = { ...nextErrors.basic, fullName: 'Full name is required.' }
    }
    if (!values.basic.email.trim()) {
      nextErrors.basic = { ...nextErrors.basic, email: 'Email is required.' }
    } else if (!emailValid) {
      nextErrors.basic = { ...nextErrors.basic, email: 'Enter a valid email address.' }
    }
    if (!values.availability.timezone.trim()) {
      nextErrors.availability = { ...nextErrors.availability, timezone: 'Timezone is required.' }
    } else if (!timezoneValid) {
      nextErrors.availability = { ...nextErrors.availability, timezone: 'Use TZ format, e.g. America/New_York.' }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !clientId) return

    setSubmitting(true)
    try {
      const experienceLevelValue = values.background.experienceLevel

      const submission: ClientIntakeSubmission = {
        contact: {
          fullName: values.basic.fullName,
          email: values.basic.email,
          phone: values.basic.phone,
        },
        goals: {
          primaryGoal: values.goals.primaryGoal,
          secondaryGoal: values.goals.secondaryGoal,
          notes: values.goals.notes,
        },
        background: {
          experienceLevel: experienceLevelValue ? experienceLevelValue : undefined,
          equipmentAccess: values.background.equipmentAccess,
          injuries: values.background.injuries,
        },
        availability: {
          preferredDays: values.availability.preferredDays,
          preferredTimes: values.availability.preferredTimes,
          timezone: values.availability.timezone,
        },
      }

      const record = await saveClientIntake(clientId, submission)
      onSuccess?.(record)
      setValues(EMPTY_VALUES)
      setErrors({})
    } catch (error) {
      console.error('Failed to save intake:', error)
      setErrors({ basic: { ...errors.basic, email: 'Failed to save intake. Please try again.' } })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-indigo-500">Step 1</p>
          <h3 className="text-lg font-semibold text-slate-900">Client details</h3>
          <p className="text-sm text-slate-600">Introduce your client and how to reach them.</p>
        </header>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Full name *</span>
            <Input
              value={values.basic.fullName}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  basic: { ...previous.basic, fullName: event.target.value },
                }))
              }
              required
              placeholder="Jordan Sparks"
              aria-invalid={errors.basic?.fullName ? 'true' : 'false'}
            />
            {errors.basic?.fullName ? <span className="text-xs text-red-500">{errors.basic.fullName}</span> : null}
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Email *</span>
            <Input
              value={values.basic.email}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  basic: { ...previous.basic, email: event.target.value },
                }))
              }
              required
              placeholder="jordan@example.com"
              type="email"
              aria-invalid={errors.basic?.email ? 'true' : 'false'}
            />
            {errors.basic?.email ? <span className="text-xs text-red-500">{errors.basic.email}</span> : null}
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 md:col-span-2">
            <span>Phone</span>
            <Input
              value={values.basic.phone}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  basic: { ...previous.basic, phone: event.target.value },
                }))
              }
              placeholder="+1 234 567 890"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-indigo-500">Step 2</p>
          <h3 className="text-lg font-semibold text-slate-900">Goals & context</h3>
          <p className="text-sm text-slate-600">Understand desired outcomes and supporting notes.</p>
        </header>
        <div className="mt-4 grid gap-4">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Primary goal</span>
            <Input
              value={values.goals.primaryGoal}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  goals: { ...previous.goals, primaryGoal: event.target.value },
                }))
              }
              placeholder="e.g. build strength, weight loss, race prep"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Secondary goal</span>
            <Input
              value={values.goals.secondaryGoal}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  goals: { ...previous.goals, secondaryGoal: event.target.value },
                }))
              }
              placeholder="Optional secondary focus"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Notes</span>
            <Textarea
              value={values.goals.notes}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  goals: { ...previous.goals, notes: event.target.value },
                }))
              }
              rows={4}
              placeholder="Share past accomplishments, big milestones, or context for motivation."
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-indigo-500">Step 3</p>
          <h3 className="text-lg font-semibold text-slate-900">Training background</h3>
          <p className="text-sm text-slate-600">Capture experience level and constraints.</p>
        </header>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Experience level</span>
            <select
              value={values.background.experienceLevel}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  background: {
                    ...previous.background,
                    experienceLevel: event.target.value as IntakeFormValues['background']['experienceLevel'],
                  },
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Select option</option>
              {EXPERIENCE_OPTIONS.filter(Boolean).map((option) => (
                <option key={option} value={option}>
                  {option[0]?.toUpperCase()}
                  {option.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Equipment access</span>
            <Input
              value={values.background.equipmentAccess}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  background: { ...previous.background, equipmentAccess: event.target.value },
                }))
              }
              placeholder="e.g. commercial gym, home setup"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
            <span>Injuries or limitations</span>
            <Textarea
              value={values.background.injuries}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  background: { ...previous.background, injuries: event.target.value },
                }))
              }
              rows={3}
              placeholder="List relevant injuries, surgeries, or doctor guidance."
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-indigo-500">Step 4</p>
          <h3 className="text-lg font-semibold text-slate-900">Availability</h3>
          <p className="text-sm text-slate-600">Align on preferred schedule windows.</p>
        </header>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
            <span>Preferred training days</span>
            <Input
              value={values.availability.preferredDays}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  availability: { ...previous.availability, preferredDays: event.target.value },
                }))
              }
              placeholder="e.g. Mon, Wed, Fri"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Preferred time windows</span>
            <Input
              value={values.availability.preferredTimes}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  availability: { ...previous.availability, preferredTimes: event.target.value },
                }))
              }
              placeholder="e.g. 6–8 AM, 6–8 PM"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Timezone *</span>
            <Input
              value={values.availability.timezone}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  availability: { ...previous.availability, timezone: event.target.value },
                }))
              }
              required
              placeholder="e.g. America/New_York"
              aria-invalid={errors.availability?.timezone ? 'true' : 'false'}
            />
            {errors.availability?.timezone ? (
              <span className="text-xs text-red-500">{errors.availability.timezone}</span>
            ) : null}
          </label>
        </div>
      </section>

      <footer className="flex flex-col items-start gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Required fields marked with *. Double-check details before saving to ensure downstream scheduling stays accurate.
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={!clientId || submitting}>
            {submitting ? 'Saving intake…' : 'Save intake details'}
          </Button>
        </div>
      </footer>
    </div>
  )
}
