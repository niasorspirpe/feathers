const { NotAuthenticated } = require('@feathersjs/errors');
const BaseStrategy = require('./strategy');
const SPLIT_HEADER = /(\S+)\s+(\S+)/;

module.exports = class JWTStrategy extends BaseStrategy {
  getEntity (id, params) {
    const { service } = this.authentication.configuration;
    const entityService = this.app.service(service);

    if (!entityService) {
      return Promise.reject(
        new NotAuthenticated(`Could not find entity service '${service}'`)
      );
    }

    return entityService.get(id, params);
  }

  authenticate (authentication, params) {
    const { accessToken, strategy } = authentication;
    const { entity } = this.authentication.configuration;

    if (!accessToken || (strategy && strategy !== this.name)) {
      return Promise.reject(new NotAuthenticated('Not authenticated'));
    }

    return this.authentication.verifyJWT(accessToken, params.jwt).then(payload => {
      const entityId = payload.sub;
      const result = {
        accessToken,
        authentication: {
          strategy: 'jwt',
          payload
        }
      };

      if (entity === null) {
        return result;
      }

      return this.getEntity(entityId, params)
        .then(value => Object.assign(result, {
          [entity]: value
        }));
    });
  }

  parse (req) {
    const result = { strategy: this.name };
    const { header, schemes } = this.configuration;
    const headerValue = req.headers && req.headers[header.toLowerCase()];

    if (!headerValue || typeof headerValue !== 'string') {
      return null;
    }

    const [ , scheme, schemeValue ] = headerValue.match(SPLIT_HEADER) || [];
    const hasScheme = scheme && schemes.some(
      current => new RegExp(current, 'i').test(scheme)
    );

    return Object.assign(result, {
      accessToken: hasScheme ? schemeValue : headerValue
    });
  }
};
