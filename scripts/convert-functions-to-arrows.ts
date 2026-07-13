import {
  FunctionDeclaration,
  Node,
  Project,
  SyntaxKind,
  type SourceFile,
} from 'ts-morph'

interface ConversionResult {
  converted: string[]
  skipped: Array<{
    name: string
    file: string
    reason: string
  }>
}

const project = new Project({
  tsConfigFilePath: 'pwa/tsconfig.json',
  skipAddingFilesFromTsConfig: false,
})

const result: ConversionResult = {
  converted: [],
  skipped: [],
}

const relativePath = (sourceFile: SourceFile): string =>
  sourceFile.getFilePath().replace(`${process.cwd()}/`, '')

const skip = (declaration: FunctionDeclaration, reason: string): void => {
  result.skipped.push({
    name: declaration.getName() ?? '<anonymous>',
    file: relativePath(declaration.getSourceFile()),
    reason,
  })
}

const containsLexicalHazard = (declaration: FunctionDeclaration): string | null => {
  const body = declaration.getBody()

  if (!body) {
    return 'has no implementation body'
  }

  if (declaration.isGenerator()) {
    return 'is a generator'
  }

  if (declaration.getOverloads().length > 0) {
    return 'has overload declarations'
  }

  if (body.getDescendantsOfKind(SyntaxKind.ThisKeyword).length > 0) {
    return 'uses this'
  }

  if (body.getDescendantsOfKind(SyntaxKind.SuperKeyword).length > 0) {
    return 'uses super'
  }

  const usesArguments = body
    .getDescendantsOfKind(SyntaxKind.Identifier)
    .some((identifier) => identifier.getText() === 'arguments')

  if (usesArguments) {
    return 'uses arguments'
  }

  if (body.getDescendantsOfKind(SyntaxKind.MetaProperty).length > 0) {
    return 'uses new.target or import.meta'
  }

  return null
}

/**
 * Function declarations are hoisted, while const arrow functions are not.
 * Skip any function referenced earlier in the same file.
 */
const isUsedBeforeDeclaration = (declaration: FunctionDeclaration): boolean => {
  const nameNode = declaration.getNameNode()

  if (!nameNode) return false

  const declarationStart = declaration.getStart()

  return nameNode
    .findReferencesAsNodes()
    .some(
      (reference) =>
        reference.getSourceFile() === declaration.getSourceFile() &&
        reference.getStart() < declarationStart,
    )
}

const getTypeParametersText = (declaration: FunctionDeclaration): string => {
  const parameters = declaration.getTypeParameters()

  if (parameters.length === 0) return ''

  const text = parameters.map((parameter) => parameter.getText()).join(', ')

  const isTsx = declaration.getSourceFile().getFilePath().endsWith('.tsx')

  const trailingComma = isTsx && parameters.length === 1 ? ',' : ''

  return `<${text}${trailingComma}>`
}

const getParametersText = (declaration: FunctionDeclaration): string =>
  declaration
    .getParameters()
    .map((parameter) => parameter.getText())
    .join(', ')

const getReturnTypeText = (declaration: FunctionDeclaration): string => {
  const returnTypeNode = declaration.getReturnTypeNode()

  return returnTypeNode ? `: ${returnTypeNode.getText()}` : ''
}

const getAsyncText = (declaration: FunctionDeclaration): string =>
  declaration.isAsync() ? 'async ' : ''

const getExportPrefix = (declaration: FunctionDeclaration): string => {
  if (declaration.isDefaultExport()) {
    return ''
  }

  return declaration.isExported() ? 'export ' : ''
}

const buildArrowText = (declaration: FunctionDeclaration): string => {
  const name = declaration.getNameOrThrow()
  const body = declaration.getBodyOrThrow()

  const typeParameters = getTypeParametersText(declaration)

  const parameters = getParametersText(declaration)

  const returnType = getReturnTypeText(declaration)

  const asyncText = getAsyncText(declaration)

  const exportPrefix = getExportPrefix(declaration)

  const declarationText =
    `${exportPrefix}const ${name} = ` +
    `${asyncText}${typeParameters}` +
    `(${parameters})${returnType} => ` +
    body.getText()

  if (!declaration.isDefaultExport()) {
    return declarationText
  }

  return `${declarationText}

export default ${name}`
}

const convertFunction = (declaration: FunctionDeclaration): void => {
  const name = declaration.getName()

  if (!name) {
    skip(declaration, 'is anonymous')
    return
  }

  const hazard = containsLexicalHazard(declaration)

  if (hazard) {
    skip(declaration, hazard)
    return
  }

  const parent = declaration.getParent()

  if (parent && !Node.isSourceFile(parent)) {
    skip(declaration, 'is nested inside another scope')
    return
  }

  if (isUsedBeforeDeclaration(declaration)) {
    skip(declaration, 'is referenced before its declaration')
    return
  }

  const file = relativePath(declaration.getSourceFile())

  declaration.replaceWithText(buildArrowText(declaration))

  result.converted.push(`${file}: ${name}`)
}

const shouldSkipFile = (sourceFile: SourceFile): boolean => {
  const path = sourceFile.getFilePath()

  return (
    path.includes('/node_modules/') ||
    path.includes('/dist/') ||
    path.includes('/amplify/') ||
    path.endsWith('.d.ts') ||
    path.includes('.test.') ||
    path.includes('.spec.')
  )
}

const main = async (): Promise<void> => {
  for (const sourceFile of project.getSourceFiles()) {
    if (shouldSkipFile(sourceFile)) {
      continue
    }

    /*
     * Copy the array first because replacing nodes
     * invalidates the original node instances.
     */
    const functions = [...sourceFile.getFunctions()]

    for (const declaration of functions) {
      convertFunction(declaration)
    }

    sourceFile.formatText({
      indentSize: 2,
    })
  }

  await project.save()

  console.log(`Converted ${result.converted.length} function declarations.`)

  for (const item of result.converted) {
    console.log(`  ✓ ${item}`)
  }

  console.log(`Skipped ${result.skipped.length} declarations.`)

  for (const item of result.skipped) {
    console.log(`  - ${item.file}: ${item.name}, ${item.reason}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
