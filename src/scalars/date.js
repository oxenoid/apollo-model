import {GraphQLScalarType} from 'graphql';
import gql from 'graphql-tag';

export const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date type',
  serialize: val => val.toISOString(),
  parseValue: val => new Date(val),
  parseLiteral: ast => new Date(ast.value),
});

export const DateSchema = gql`
  scalar Date
`;
