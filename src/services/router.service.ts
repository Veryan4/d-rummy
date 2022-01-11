const ROUTE_EVENT = "route-update"

export const routerService = {
  parseQuery,
  parseParams,
  patternToRegExp,
  testRoute,
  navigate,
  ROUTE_EVENT
};

function navigate(href: string): void {
  window.history.pushState({}, "", href);
  window.dispatchEvent(new CustomEvent(ROUTE_EVENT, { detail: href }));
}

function parseQuery(querystring: string): any {
  return querystring
    ? JSON.parse(
        '{"' +
          querystring.substring(1).replace(/&/g, '","').replace(/=/g, '":"') +
          '"}'
      )
    : {};
}

function parseParams(pattern: string, uri: string): Record<string, string> {
  const params: Record<string, string> = {};

  const patternArray = pattern.split("/").filter((path) => {
    return path != "";
  });
  const uriArray = uri.split("/").filter((path) => {
    return path != "";
  });

  patternArray.map((pattern: string, i: number) => {
    if (/^:/.test(pattern)) {
      params[pattern.substring(1)] = uriArray[i];
    }
  });
  return params;
}

function patternToRegExp(pattern: string): RegExp {
  if (pattern) {
    return new RegExp(
      "^(|/)" +
        pattern.replace(
          /:[^\s/]+/g,
          "([\\w\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff-]+)"
        ) +
        "(|/)$"
    );
  } else {
    return new RegExp("(^$|^/$)");
  }
}

function testRoute(uri: string, pattern: string): boolean | void {
  if (patternToRegExp(pattern).test(uri)) {
    return true;
  }
}
