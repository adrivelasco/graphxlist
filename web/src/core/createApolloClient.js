import { ApolloClient } from 'apollo-client';
import { from } from 'apollo-link';
import { onError } from 'apollo-link-error';
import { HttpLink } from 'apollo-link-http';
import fetch from 'isomorphic-unfetch';

import createCache from './createCache';

const IS_BROWSER = process.env.BROWSER;

// Polyfill fetch() on the server (used by apollo-client)
if (!IS_BROWSER) {
  global.fetch = fetch;
}

/**
 * Create Apollo Client
 * @param {Object} Options
 * @param {String} Options.graphQlApiUrl - GraphQL API Url
 */
export default function createApolloClient({ graphQlApiUrl }) {
  // "apollo-link" is a standard interface for modifying control flow of GraphQL requests and fetching GraphQL results,
  // designed to provide a simple GraphQL client that is capable of extensions.
  // https://github.com/apollographql/apollo-link
  const link = from([
    // Handle and inspect errors in your GraphQL network stack.
    // https://github.com/apollographql/apollo-link/tree/master/packages/apollo-link-error
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors) {
        graphQLErrors.map(({ message, locations, path }) =>
          console.warn(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
        );
      }
      if (networkError) {
        console.warn(`[Network error]: ${networkError}`);
      }
    }),

    // HTTP Link takes an object with some options on it to customize the behavior of the link.
    // If your server supports it, the HTTP link can also send over metadata about the request in the extensions field.
    // https://github.com/apollographql/apollo-link/tree/master/packages/apollo-link-http
    new HttpLink({
      uri: graphQlApiUrl,
      credentials: 'same-origin'
    })
  ]);

  const cache = createCache();

  return new ApolloClient({
    link,
    ssr: !IS_BROWSER,
    cache: IS_BROWSER ? cache.restore(window.APOLLO_STATE) : cache,
    queryDeduplication: true,
    connectToDevTools: IS_BROWSER
  });
}
