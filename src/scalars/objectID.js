import { GraphQLScalarType, Kind } from 'graphql';
import gql from 'graphql-tag';
import { ObjectID } from 'mongodb';

export default new GraphQLScalarType({
  name: 'ObjectID',
  description: 'MongoDB ObjectID type',
  serialize: val => val.toString(),
  parseValue: val => ObjectID(val),
  parseLiteral: ast =>
    ast.kind === Kind.STRING ? ObjectID(ast.value) : ast.value,
});

export const typeDef = gql`
  scalar ObjectID
`;
