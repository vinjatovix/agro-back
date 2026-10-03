import { readFileSync } from 'node:fs';
import ts from 'typescript';

export const EXPLICIT_NAMES: ReadonlySet<string> = new Set([
  'db',
  'DBClient',
  'appVersion',
  'logger',
  'bedPersistenceMapper',
  'familyPersistenceMapper',
  'plantPersistenceMapper'
]);

export function getCradlePropertyNames(cradleFilePath: string): string[] {
  const sourceFile = ts.createSourceFile(
    cradleFilePath,
    readFileSync(cradleFilePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true
  );

  const propertyNames: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === 'ContainerCradle' &&
      ts.isTypeLiteralNode(node.type)
    ) {
      for (const member of node.type.members) {
        if (ts.isPropertySignature(member) && member.name) {
          propertyNames.push(member.name.getText(sourceFile));
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return propertyNames;
}
