import { observer } from 'mobx-react-lite'
import * as React from 'react'

import { TextField } from '@material-ui/core'
import { StandardTextFieldProps } from '@material-ui/core/TextField'
import { Autocomplete } from '@material-ui/lab'

import { ClarityState, ClarityTask } from '../ClarityState'

export type ClarityTaskSelectProps = {
  clarityState: ClarityState
  onChange: (taskIntId: number | undefined) => void
  value: number | undefined
} & Omit<StandardTextFieldProps, 'onChange' | 'value'>

export const ClarityTaskSelect = observer(
  ({
    clarityState,
    onChange,
    value,
    style,
    disabled,
    ...textFieldProps
  }: ClarityTaskSelectProps) => {
    const maxEntries = 20

    const resolvedVal = (value && clarityState.resolveTask(value)) ?? ''
    console.log('value ' + value + ' res ', resolvedVal)

    return (
      <Autocomplete
        renderInput={(params) => <TextField {...params} {...textFieldProps} />}
        options={clarityState.tasks}
        disabled={disabled}
        style={style}
        filterOptions={(options: ClarityTask[], state) => {
          const result = []
          const inputParts = state.inputValue
            .toLowerCase()
            .replace('/', ' ')
            .trim()
            .split(/[\s*]+/)
          for (let i = 0; i < options.length && result.length <= maxEntries; i++) {
            const task = options[i]
            if (
              inputParts.every(
                (ip) =>
                  task.name.toLowerCase().includes(ip) ||
                  task.projectName.toLowerCase().includes(ip),
              )
            ) {
              result.push(task)
            }
          }
          return result
        }}
        onChange={(_: unknown, clarityTask: ClarityTask | undefined) =>
          onChange(clarityTask?.intId)
        }
        value={resolvedVal}
        renderOption={(option: ClarityTask, _state) => (
          <>
            <div style={{ width: '30%' }}>{option.projectName}</div>
            <div style={{ width: '30%' }}>{option.name}</div>
            <div style={{ width: '30%' }}>{option.strId}</div>
          </>
        )}
        getOptionLabel={(x: ClarityTask) => (x ? x.projectName + ' / ' + x.name : '')}
      />
    )
  },
)
