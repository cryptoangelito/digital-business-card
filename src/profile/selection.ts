import { FragmentDefinitionNode, GraphQLResolveInfo, SelectionSetNode, GraphQLIncludeDirective, GraphQLSkipDirective, getDirectiveValues } from 'graphql';

export interface RelationSelection {
  skills: boolean;
  experience: boolean;
  projects: boolean;
}

/**
 * Inspect requested fields under `profile` once and include only required
 * Prisma relations. Supports aliases, inline fragments and named fragments.
 * GraphQL field aliases don't change the original schema field name.
 */
export function requestedRelations(
  info: Pick<GraphQLResolveInfo, 'fieldNodes' | 'fragments'> & Partial<Pick<GraphQLResolveInfo, 'variableValues'>>,
): RelationSelection {
  const names = new Set<string>();
  const visitedFragments = new Set<string>();

  function visit(set: SelectionSetNode | undefined): void {
    if (!set) return;
    for (const selection of set.selections) {
      if (getDirectiveValues(GraphQLSkipDirective, selection, info.variableValues)?.if === true ||
          getDirectiveValues(GraphQLIncludeDirective, selection, info.variableValues)?.if === false) continue;
      if (selection.kind === 'Field') {
        names.add(selection.name.value);
      } else if (selection.kind === 'InlineFragment') {
        visit(selection.selectionSet);
      } else if (selection.kind === 'FragmentSpread') {
        const name = selection.name.value;
        if (visitedFragments.has(name)) continue;
        visitedFragments.add(name);
        const fragment: FragmentDefinitionNode | undefined = info.fragments[name];
        visit(fragment?.selectionSet);
      }
    }
  }

  for (const node of info.fieldNodes) visit(node.selectionSet);

  return {
    skills: names.has('skills'),
    experience: names.has('experience'),
    projects: names.has('projects'),
  };
}
