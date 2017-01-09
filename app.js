const kaltura = require('kaltura');
const request = require('request');
const qs = require('qs');
const config = require('./config');
const DEBUG = true;

function debug() {
  if (DEBUG) {
    return console.info.apply(this, arguments);
  }
}

function initKaltura() {
  // https://knowledge.kaltura.com/introduction-kaltura-client-libraries#UsingaClientObjecttoPerformanAPICall
  const kaltura_conf = new kaltura.kc.KalturaConfiguration(config.kaltura.partner_id);
  kaltura_conf.serviceUrl = config.kaltura.service_url;
  kaltura_conf.logger = console;
  const client = new kaltura.kc.KalturaClient(kaltura_conf);
  const type = kaltura.kc.enums.KalturaSessionType.ADMIN;
  // const expiry = null;
  // const privileges = null;
  client.session.start(clientReady, config.kaltura.secret, config.kaltura.user, type, config.kaltura.partner_id);

  function clientReady(ks) {
    client.setKs(ks);
    // client.baseEntry.get(console.log, '0_emj1fm8l');
    client.media.listAction(console.log, null, {
      pageSize: 2,
      pageIndex: 1
    });
  }  
}

let mpxToken='UNAUTHENTICATED';
// const mpxToken = config.mpx.testToken;

function mpxRequest(req, cb) {
  if (!req.auth && mpxToken !== 'UNAUTHENTICATED') {
    req.url += '&' + qs.stringify({
      token: mpxToken.token
    });
  }
  debug('url', req.url);
  if (typeof req.body !== 'undefined') {
    // add ownerId from current mpxToken to entries
    if (req.body.entries) {
      for (let e of req.body.entries) {
        if (e.ownerId === null) {
          e.ownerId = mpxToken.userId;
        }
      };      
    }
    req.body = JSON.stringify(req.body);
  }
  request(req, (err, response, body) => {
    if (err) {
      throw new Error(err);
    }
    else if (response.statusCode != 200) {
      throw new Error(`HTTP Error ${response.statusCode}: ${response.statusMessage}.  Content: ${body}`);
    }
    else {
      const parsed = JSON.parse(body);
      if (parsed.isException) {
        console.error('Error with URL', req.url);
        throw new Error(body);
      }
      if (cb) cb(parsed);
    }
  });
}

function mpxObject(settings) {
  this.endpoint = settings.endpoint;
  this.schema = settings.schema;
  this.searchSchema = settings.searchSchema;
  this.form = settings.form;
  this.plcategory = settings.plcategory;
  this.query = function() { return qs.stringify({schema: this.schema, searchSchema: this.searchSchema, form: this.form}) };
  this.create = function(entries, cb) {
      mpxRequest({
        method: 'POST',
        url: this.endpoint + '?' + this.query(),
        body: {
          "$xmlns": {
            "plcategory": this.plcategory
          },
          "entries": entries
        }
      }, cb);    
    };
  this.read = function(cb) {
      mpxRequest({
        method: 'GET',
        url: this.endpoint + '?' + this.query(),
      }, cb);
    };
  this.update = function(entries, cb) {
      mpxRequest({
        method: 'PUT',
        url: this.endpoint + '?' + this.query(),
        body: {
          "$xmlns": {
            "plcategory": this.plcategory
          },
          "entries": entries
        }
      }, cb);    
    };
  this.delete = function(id, filter, cb) {
      let filterQuery = (typeof filter === 'undefined') ? '' : '&' + qs.stringify(filter);
      mpxRequest({
        method: 'DELETE',
        url: `${this.endpoint}/${id}?${this.query()}${filterQuery}`,
      }, cb);    
  }    
};

const mpxCategory = new mpxObject({
  endpoint: 'https://data.media.theplatform.eu/media/data/Category',
  schema: '1.8.0',
  searchSchema: '1.0.0',
  form: 'cjson',
  plcategory: 'http://xml.theplatform.com/media/data/Category',
});

function authenticateMpx(cb) {
  const user = config.mpx.user;
  const pass = config.mpx.pass;
  mpxRequest({
    url: `https://identity.auth.theplatform.eu/idm/web/Authentication/signIn?schema=1.1&form=json&`,
    auth: {user: user, pass: pass},
    body: {
      'signIn': {
        'duration': 30,
        'idleTimeout': 0
      }
    }
  }, (parsed) => {
    mpxToken = parsed.signInResponse;
    debug(mpxToken);
    if (cb) cb();
  });
}

// authenticateMpx(getCategories);
// insertMedia();
// mpxCategory.read(console.info);
// mpxCategory.create([{
//   "title": "Football",
//   "description": "Content related to football",
//   "ownerId": null,
//   "locked": true,
//   "plcategory$scheme": "News"
// }], console.info);
// authenticateMpx(mpxCategory.read);
