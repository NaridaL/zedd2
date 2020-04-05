import { TextField, TextFieldProps, Popper, PopperProps } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { Autocomplete } from '@material-ui/lab'
import PopperJs from 'popper.js'
import { debounce } from 'lodash'
import { observer } from 'mobx-react-lite'
import { remote } from 'electron'
import * as React from 'react'

import { useCallback, useState, useRef, useEffect, RefObject } from 'react'
import { Task } from '../AppState'
import { formatMinutes } from '../util'

const { getCurrentWindow } = remote

export type TaskSelectProps = {
  tasks: Task[]

  getTasksForSearchString: (search: string) => Promise<Task[]>
  onChange: (event: React.ChangeEvent<{}>, value: Task | string | undefined) => void
  value: Task
  handleError: (err: Error) => void
  textFieldStyle?: React.CSSProperties
  hoverMode?: boolean
  getMinutesForTask: (t: Task) => number
} & Omit<TextFieldProps, 'value' | 'onChange' | 'variant'>

type CancellablePromise<T> = Promise<T> & { cancelled: boolean; cancel(): void }

function cancellable<T>(p: Promise<T>): CancellablePromise<T> {
  return {
    p,
    cancelled: false,
    then(onfulfilled) {
      return cancellable(p.then((x) => !this.cancelled && onfulfilled && onfulfilled(x)))
    },
    finally(onfinally) {
      return cancellable(p.finally(() => !this.cancelled && onfinally && onfinally()))
    },
    catch(onrejected) {
      return cancellable(p.catch((x) => !this.cancelled && onrejected && onrejected(x)))
    },
    cancel() {
      this.cancelled = true
    },
    get [Symbol.toStringTag]() {
      return p[Symbol.toStringTag]
    },
  } as CancellablePromise<T>
  // let cancel: () => void
  // const result: CancellablePromise<T> = new Promise((resolve, reject) => {
  //   let cancelled = false
  //   p.then(x => !cancelled && resolve(x)).catch(x => !cancelled && reject(x))
  //   cancel = () => (cancelled = true)
  // }) as any
  // result.cancel = cancel!
  // return result
}

function cancellingPrevious<T, F extends (...args: any[]) => Promise<T>>(
  x: F,
): (...args: Parameters<F>) => CancellablePromise<T> {
  let lastPromise: CancellablePromise<any> | undefined = undefined
  return ((...args: any[]) => {
    lastPromise && lastPromise.cancel()
    return (lastPromise = cancellable(x(...args)))
  }) as any
}

const useDebouncedEffect = () => {}

const useStyles = makeStyles((theme) => ({
  listbox: { maxHeight: 'calc(max(300px, 80vh))' },
  inputRoot: { color: 'inherit' },
  inputInput: { color: 'inherit' },
  endAdornment: { color: 'inherit', '& *': { color: 'inherit' } },
  underline: {
    '&&&:before': {
      borderBottom: 'none',
    },
    '&&:after': {
      borderBottom: 'none',
    },
  },
  renderOptionBT: {
    textAlign: 'right',
    padding: '0px 8px',
    color: theme.palette.text.secondary,
  },
}))
const CustomPopper = (props: PopperProps) => {
  const ref: RefObject<PopperJs> = useRef<PopperJs>(null)
  useEffect(() => {
    console.log(ref.current)
    setTimeout(() => console.log(ref.current), 2000)
  })
  return (
    <Popper
      {...props}
      style={{ ...props.style, width: 'auto', marginLeft: -1, marginRight: 5 }}
      placement='bottom'
      modifiers={{
        flip: {
          enabled: false,
        },
        preventOverflow: {
          enabled: false,
          boundariesElement: 'scrollParent',
        },
      }}
      popperOptions={{
        onCreate: ({ popper }: PopperJs) => {
          console.log(popper)
          getCurrentWindow().setBounds({ height: popper.bottom | 0 })
        },
        onUpdate: ({ popper }) => {
          console.log(popper)
          getCurrentWindow().setBounds({ height: popper.bottom | 0 })
        },
      }}
      ref={ref}
    />
  )
}

export const TaskSelect = observer(
  ({
    onChange,
    tasks,
    style,
    textFieldStyle,
    getTasksForSearchString,
    value,
    handleError,
    getMinutesForTask,
    hoverMode = false,
    ...textFieldProps
  }: TaskSelectProps) => {
    const [options, setOptions] = useState([] as Task[])

    const [currentRequest] = useState({ id: 0 })

    const classes = useStyles()

    const getTasksForSearchStringDebounced = useCallback(
      debounce((searchString: string) => {
        if (searchString.length > 2) {
          const requestId = ++currentRequest.id
          getTasksForSearchString(searchString)
            .then((ts) => requestId === currentRequest.id && setOptions(ts))
            .catch(handleError)
        }
      }, 1000),
      [getTasksForSearchString],
    )

    const onTextFieldChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => getTasksForSearchStringDebounced(e.target.value),
      [getTasksForSearchStringDebounced],
    )

    if (textFieldProps.inputProps) throw new Error('???')

    return (
      <Autocomplete
        options={[...tasks, ...options]}
        onChange={onChange}
        style={style}
        openOnFocus={false}
        value={value ?? ''}
        freeSolo
        forcePopupIcon
        autoSelect
        selectOnFocus
        getOptionLabel={(t: Task | string) =>
          'string' === typeof t ? t : 'UNDEFINED' === t.name ? '' : t.name
        }
        classes={{ listbox: classes.listbox, endAdornment: classes.endAdornment }}
        PopperComponent={hoverMode ? CustomPopper : undefined}
        onClose={() => hoverMode && getCurrentWindow().setBounds({ height: 32 })}
        renderInput={(params) => (
          <TextField
            {...params}
            {...textFieldProps}
            style={textFieldStyle}
            onChange={onTextFieldChange}
            placeholder='Nothing. Nichts. Nada. Absolument rien.'
            InputProps={{
              ...params.InputProps,
              classes: {
                root: classes.inputRoot,
                input: classes.inputInput,
                underline: classes.underline,
              },
            }}
            margin='dense'
          />
        )}
        renderOption={(t: Task) => (
          <>
            <span className={classes.renderOptionBT}>{formatMinutes(getMinutesForTask(t))} BT</span>
            <span>{'UNDEFINED' === t.name ? '' : t.name}</span>
          </>
        )}
      ></Autocomplete>
    )
  },
)
