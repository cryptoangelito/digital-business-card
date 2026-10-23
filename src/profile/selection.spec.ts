import { parse } from 'graphql';
import { requestedRelations } from './selection';

function infoFrom(query: string) {
  const document = parse(query);
  const operation = document.definitions.find((d) => d.kind === 'OperationDefinition');
  if (!operation || operation.kind !== 'OperationDefinition') throw new Error('No operation');
  const node = operation.selectionSet.selections.find((s) => s.kind === 'Field');
  if (!node || node.kind !== 'Field') throw new Error('No root field');
  const fragments = Object.fromEntries(
    document.definitions.filter((d) => d.kind === 'FragmentDefinition').map((d) => [d.name.value, d]),
  );
  return { fieldNodes: [node], fragments };
}

describe('requestedRelations', () => {
  it('does not fetch unused relations', () => {
    expect(requestedRelations(infoFrom('query { profile { name } }'))).toEqual({
      skills: false, experience: false, projects: false,
    });
  });

  it('detects aliased fields, inline fragments, and named fragments', () => {
    const query = `
      query {
        profile {
          alias: skills { name }
          ... on Profile { experience { company } }
          ...ProjectFields
        }
      }
      fragment ProjectFields on Profile { projects { name } }
    `;
    expect(requestedRelations(infoFrom(query))).toEqual({
      skills: true, experience: true, projects: true,
    });
  });
});
