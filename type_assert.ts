/**
 * 基本类型断言字符串。
 * 对应 JavaScript 的 typeof 结果，以及 'array', 'object', 'any'。
 */
export type BasicAssertion = 
      'number'
    | 'string'
    | 'boolean'
    | 'array'
    | 'object'
    | 'function'
    | 'any'

/**
 * 空值断言字符串。
 * 'null' 或 'undefined'。
 */
export type NullAssertion = 'null' | 'undefined'

/**
 * 可空基本类型断言字符串。
 * 在基本类型断言后加上 '?'，表示该类型或 undefined/null。
 */
export type NullableBasicAssertion = `${BasicAssertion}?`

/**
 * 对象结构断言接口。
 * 键为属性名，值为该属性的断言。
 */
export interface ObjectAssertion {
  [key: string]: Assertion
}

/**
 * 数组结构断言类型。可以是
 * - 空数组：表示任意元素、任意长度的数组，也就是 'array' 的简写。
 * - 单元素数组：[type]：表示数组中所有元素都必须满足该类型。
 * - 多元素数组：[type1, type2, ...]：表示元组，数组长度和每个位置的类型都必须严格匹配。
 */
export type ArrayAssertion = [] | Assertion[]

/**
 * 创建一个类断言。
 * 
 * 注意：如果环境中使用打包工具（如Webpack、Rollup等）进行代码打包，类的名称可能会被重命名或混淆，
 * 这种情况下请配置打包工具以保留类名，或者使用类构造函数来创建断言。
 * 
 * @param nameOrPrototype - 类名字符串或类构造函数。
 * @returns 一个类断言对象。
 */
export const clazz = (nameOrPrototype: string | ClassConstructorTypeHelper): ClassAssertion => {
    if (typeof nameOrPrototype === 'string') {
        return new ClassNameAssertion(nameOrPrototype)
    } else {
        return new ClassPrototypeAssertion(nameOrPrototype)
    }
}

/**
 * 创建一个“任意匹配”断言（逻辑或）。
 * 只要值满足其中一个断言，即视为通过。
 * 
 * @param assertions - 一组断言。
 * @returns 一个 AnyOfAssertion 对象。
 */
export const sum = (...assertions: Assertion[]): AnyOfAssertion => {
    const ret = new AnyOfAssertion([])
    for (const assertion of assertions) {
        if (assertion instanceof AnyOfAssertion) {
            ret.assertions.push(...assertion.assertions)
        } else {
            ret.assertions.push(assertion)
        }
    }
    return ret
}

/**
 * 创建一个“全部匹配”断言（逻辑与）。
 * 值必须满足所有给定的断言。
 * 
 * @param assertions - 一组断言。
 * @returns 一个 AllOfAssertion 对象。
 */
export const chain = (...assertions: Assertion[]): AllOfAssertion => {
    const ret = new AllOfAssertion([])
    for (const assertion of assertions) {
        if (assertion instanceof AllOfAssertion) {
            ret.assertions.push(...assertion.assertions)
        } else {
            ret.assertions.push(assertion)
        }
    }
    return ret
}

/**
 * 创建一个值断言。
 * 值必须严格等于（===）给定的值。
 * 
 * @param val - 期望的值。
 * @returns 一个 ValueAssertion 对象。
 */
export const value = (val: any): ValueAssertion => new ValueAssertion(val)

/**
 * 创建一个可空断言。
 * 值可以是 null、undefined，或者满足给定的断言。
 * 
 * @param assertion - 基础断言。
 * @returns 一个新的断言，允许值为 null 或 undefined。
 * @throws 如果传入的断言已经是 'null' 或 'undefined'，则抛出错误。
 */
export const nullable = (assertion: Assertion): Assertion => {
    if (assertion === 'null' || assertion === 'undefined') {
        throw new Error("Cannot wrap 'null' or 'undefined' with 'nullable'")
    }
    
    if (typeof assertion === 'string') {
        if (assertion.endsWith('?')) {
            return assertion
        } else {
            return `${assertion}?` as NullableBasicAssertion
        }
    } else if (assertion instanceof NullableAssertion) {
        return assertion
    } else {
        return new NullableAssertion(assertion)
    }
}

/**
 * 自定义函数断言类型。
 * 接收一个值，返回 boolean 或 string。
 * 返回 true 表示通过，返回 false 或 string 表示失败（string 为错误信息）。
 */
export type CustomFunctionAssertion = (value: any) => boolean | string

/**
 * 断言类型定义。
 * 可以是基本类型字符串、对象结构、数组结构、类断言、逻辑组合断言、值断言或自定义函数。
 */
export type Assertion = 
      BasicAssertion
    | NullableBasicAssertion
    | NullAssertion
    | ObjectAssertion
    | ArrayAssertion
    | ClassAssertion
    | AnyOfAssertion
    | AllOfAssertion
    | ValueAssertion
    | NullableAssertion
    | CustomFunctionAssertion

/**
 * 类型断言错误类。
 * 当值不满足断言时抛出。
 */
export class TypeAssertionError extends Error {
    constructor(public path: string, public expected: string, public actual: any) {
        super(`Type assertion failed at '${path}': expected ${expected}, got ${describeValue(actual)}`)
    }
}

/**
 * AnyOf 类型断言错误类。
 * 当值不满足 AnyOf 断言中的任何一个时抛出，包含所有尝试过的断言的错误信息。
 */
export class TypeAssertionAnyOfError extends Error {
    constructor(public path: string, public errors: Error[]) {
        super(`Type assertion 'anyOf' failed at '${path}':\n` + combineMultipleErrorMessages(errors.map(e => e.message)))
    }
}

/**
 * 执行类型断言。
 * 验证给定的值是否满足指定的断言。如果不满足，则抛出异常。
 * 
 * @param value - 要验证的值。
 * @param assertion - 用来验证值的断言。
 * @throws {TypeAssertionError} 如果值不满足断言。
 * @throws {TypeAssertionAnyOfError} 如果值不满足 AnyOf 断言。
 */
export const typeAssert = (value: any, assertion: Assertion): void => typeAssertImpl('object', value, assertion)

/* --- IMPLEMENTATION --- */

class TypeAssertInternals { private __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED!: void }

type ClassConstructorTypeHelper = new (...args: any[]) => any

const isDefined = (value: any): boolean => value !== null && value !== undefined

const describeValue = (value: any): string => {
    if (value?.constructor?.name) {
        return `${value} (of class ${value.constructor.name})`
    } else {
        return `${value} (of type ${typeof value})`
    }
}

const trimEnd = (str: string): string => {
    let end = str.length
    while (end > 0 && /\s/.test(str.charAt(end - 1))) {
        end--
    }
    return str.substring(0, end)
}

const combineMultipleErrorMessages = (errors: string[]): string => {
    let ret = ''
    for (const errorMessage of errors) {
        const lines = errorMessage.split('\n')
        ret += '  - ' + lines[0] + '\n'
        for (let i = 1; i < lines.length; i++) {
            ret += '    ' + lines[i] + '\n'
        }
    }
    return trimEnd(ret)
}

class ClassNameAssertion extends TypeAssertInternals {
    constructor(public className: string) { super() }
}

class ClassPrototypeAssertion extends TypeAssertInternals {
    constructor(public classConstructor: ClassConstructorTypeHelper) { super() }
}

type ClassAssertion = ClassNameAssertion | ClassPrototypeAssertion

class AnyOfAssertion extends TypeAssertInternals {
    constructor(public assertions: Assertion[]) { super() }
}

class AllOfAssertion extends TypeAssertInternals {
    constructor(public assertions: Assertion[]) { super() }
}

class NullableAssertion extends TypeAssertInternals {
    constructor(public assertion: Assertion) { super() }
}

class ValueAssertion extends TypeAssertInternals {
    constructor(public value: any) { super() }
}

const typeAssertImpl = (path: string, value: any, assertion: Assertion): void => {
    if (typeof assertion === 'string') {
        if (assertion === 'null' || assertion === 'undefined') {
            if (isDefined(value)) {
                throw new TypeAssertionError(path, 'null or undefined', value)
            } else {
                return
            }
        }

        if (assertion.endsWith('?')) {
            if (!isDefined(value)) {
                return
            }
            assertion = assertion.slice(0, -1) as BasicAssertion
        }

        if (assertion === 'any') {
            return
        }

        if (assertion === 'array') {
            if (!Array.isArray(value)) {
                throw new TypeAssertionError(path, 'array', value)
            }
            return
        }

        if (assertion === 'object') {
            if (!isDefined(value) || typeof value !== 'object') {
                throw new TypeAssertionError(path, 'object', value)
            }
            return
        }

        if (typeof value !== assertion) {
            throw new TypeAssertionError(path, assertion, value)
        }
    } else if (Array.isArray(assertion)) {
        if (!Array.isArray(value)) {
            throw new TypeAssertionError(path, 'array', value)
        }

        if (assertion.length === 0) {
            return
        } else if (assertion.length === 1) {
            for (let index = 0; index < value.length; index++) {
                typeAssertImpl(`${path}[${index}]`, value[index], assertion[0])
            }
        } else {
            if (value.length !== assertion.length) {
                throw new TypeAssertionError(path, `array of length ${assertion.length}`, value)
            }

            for (let index = 0; index < assertion.length; index++) {
                typeAssertImpl(`${path}[${index}]`, value[index], assertion[index])
            }
        }
    } else if (assertion instanceof ClassNameAssertion) {
        const constructorName = value?.constructor?.name
        if (constructorName !== assertion.className) {
            throw new TypeAssertionError(path, `class ${assertion.className}`, value)
        }
    } else if (assertion instanceof ClassPrototypeAssertion) {
        if (!isDefined(value) || !(value instanceof assertion.classConstructor)) {
            throw new TypeAssertionError(path, `class ${assertion.classConstructor.name}`, value)
        }
    } else if (assertion instanceof AnyOfAssertion) {
        const errors: TypeAssertionError[] = []
        for (const subAssertion of assertion.assertions) {
            try {
                typeAssertImpl(path, value, subAssertion)
                return
            } catch (e) {
                if (e instanceof TypeAssertionError) {
                    errors.push(e)
                } else {
                    throw e
                }
            }
        }
        throw new TypeAssertionAnyOfError(path, errors)
    } else if (assertion instanceof AllOfAssertion) {
        for (const index in assertion.assertions) {
            typeAssertImpl(`${path}<${index}>`, value, assertion.assertions[index])
        }
    } else if (assertion instanceof ValueAssertion) {
        if (!isDefined(value) && !isDefined(assertion.value)) {
            return
        }
        
        if (Number.isNaN(value) && Number.isNaN(assertion.value)) {
            return
        }

        if (value !== assertion.value) {
            throw new TypeAssertionError(path, `value ${JSON.stringify(assertion.value)}`, value)
        }
    } else if (assertion instanceof NullableAssertion) {
        if (!isDefined(value)) {
            return
        }

        typeAssertImpl(path, value, assertion.assertion)
    } else if (typeof assertion === 'function') {
        const result = assertion(value)
        if (result === true) {
            return
        }
        
        if (typeof result === 'string') {
            throw new TypeAssertionError(path, result, value)
        } else {
            if (assertion.name) {
                throw new TypeAssertionError(path, `custom function assertion '${assertion.name}' failed`, value)
            } else {
                throw new TypeAssertionError(path, 'custom function assertion failed', value)
            }
        }
    } else if (typeof assertion === 'object') {
        if (!isDefined(value) || typeof value !== 'object') {
            throw new TypeAssertionError(path, 'object', value)
        }

        for (const key in assertion) {
            typeAssertImpl(`${path}.${key}`, value[key], assertion[key])
        }
    }
}
