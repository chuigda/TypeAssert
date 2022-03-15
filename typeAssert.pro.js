'use strict'

/* eslint-disable no-extend-native, no-use-before-define, func-names, no-shadow, no-throw-literal */
import {
  TypeStrings,
  NullableType,
  SumType,
  ChainType,
  ValueAssertion,
  enableChainAPI,
  preventErrTrace
} from './typeAssert.js'

const typeAssert = () => {}

export {
  typeAssert,
  TypeStrings,
  NullableType,
  SumType,
  ChainType,
  ValueAssertion,
  enableChainAPI,
  preventErrTrace
}
