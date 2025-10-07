import { describe, expect, it } from 'vitest'
import {
  editingStateForSet,
  extractSetIndex,
  isEditingState,
  isSavingState,
  nextFlowState,
  savingStateForSet,
} from '../stateMachine'

describe('state machine helpers', () => {
  it('creates editing states per index', () => {
    expect(editingStateForSet(2)).toBe('EDITING_SET_2')
  })

  it('creates saving states per index', () => {
    expect(savingStateForSet(3)).toBe('SAVING_SET_3')
  })

  it('detects editing states', () => {
    expect(isEditingState('EDITING_SET_1')).toBe(true)
    expect(isEditingState('READY_FOR_NEXT')).toBe(false)
  })

  it('detects saving states', () => {
    expect(isSavingState('SAVING_SET_1')).toBe(true)
    expect(isSavingState('ERROR')).toBe(false)
  })

  it('extracts set indexes', () => {
    expect(extractSetIndex('SAVING_SET_4')).toBe(4)
    expect(extractSetIndex('READY_FOR_NEXT')).toBeNull()
  })

  it('computes next flow state when idle', () => {
    expect(nextFlowState('IDLE', 4)).toBe('EDITING_SET_1')
  })

  it('moves to completion when last set done', () => {
    expect(nextFlowState('EDITING_SET_4', 4)).toBe('EDITING_SET_4')
    expect(nextFlowState('SUCCESS', 4)).toBe('READY_FOR_NEXT')
  })
})
