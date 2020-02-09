import buildVariables from './buildVariables';
import buildGqlQuery from './buildGqlQuery';
import getResponseParser from './getResponseParser';
import { IntrospectionResultData } from './definitions';
import { DocumentNode } from 'graphql';
import { IntrospectionResult } from './introspectionResult';

export const buildQueryFactory = () => (
  introspectionResults: IntrospectionResultData
) => {
  const introspection = new IntrospectionResult(introspectionResults);
  const knownResources = introspectionResults.resources.map(r => r.type.name);

  return (
    aorFetchType: string,
    resourceName: string,
    params: any,
    fragment: DocumentNode
  ) => {
    const resource = introspectionResults.resources.find(
      r => r.type.name === resourceName
    );

    if (!resource) {
      throw new Error(
        `Unknown resource ${resourceName}. Make sure it has been declared on your server side schema. Known resources are ${knownResources.join(
          ', '
        )}`
      );
    }

    const queryType = resource[aorFetchType];

    if (!queryType) {
      throw new Error(
        `No query or mutation matching aor fetch type ${aorFetchType} could be found for resource ${resource.type.name}`
      );
    }

    const variables = buildVariables(introspectionResults, introspection)(
      resource,
      aorFetchType,
      params
    )!;
    const query = buildGqlQuery(introspectionResults)(
      resource,
      aorFetchType,
      queryType,
      variables,
      fragment
    );
    const parseResponse = getResponseParser(introspectionResults)(
      aorFetchType,
      resource
    );

    return {
      query,
      variables,
      parseResponse,
    };
  };
};

export default buildQueryFactory();
