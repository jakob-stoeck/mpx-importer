const request = require('request');
const qs = require('qs');

function mpxObject(client, settings) {
  this.baseServiceUrl = settings.baseServiceUrl || 'https://data.media.theplatform.eu/media';
  this.endpoint = this.baseServiceUrl + '/data/' + settings.object + '/feed';
  this.schema = settings.schema || '1.8.0';
  this.searchSchema = settings.searchSchema || '1.0.0';
  this.form = settings.form || 'cjson';
  this.basePlcategoryUrl = settings.basePlcategoryUrl || 'http://xml.theplatform.com/media';
  this.plcategory = this.basePlcategoryUrl + '/data/' + settings.object;
  this.query = function() { return qs.stringify({schema: this.schema, searchSchema: this.searchSchema, form: this.form}) };
  this.create = function(entries, cb) {
    const body = {
      "$xmlns": {
        "plcategory": this.plcategory
      },
      "entries": entries
    };
    console.info(body);
    client.request({
      method: 'POST',
      url: this.endpoint + '?' + this.query(),
      body: body
    }, cb);    
  };
  this.read = function(cb) {
    client.request({
      method: 'GET',
      url: this.endpoint + '?' + this.query(),
    }, cb);
  };
  this.update = function(entries, cb) {
    client.request({
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
    const filterQuery = (typeof filter === 'undefined') ? '' : '&' + qs.stringify(filter);
    client.request({
      method: 'DELETE',
      url: `${this.endpoint}/${id}?${this.query()}${filterQuery}`,
    }, cb);    
  }    
};

function MpxClient(config) {
  this.init(config);
}

MpxClient.prototype.mpxToken = null;

MpxClient.prototype.request = function (req, cb) {
  if (!req.auth) {
    req.auth = { user: '', pass: this.mpxToken.token };
  }
  if (typeof req.body !== 'undefined') {
    // add ownerId from current mpxToken to entries
    if (req.body.entries) {
      for (let e of req.body.entries) {
        if (e.ownerId === null) {
          e.ownerId = this.mpxToken.userId;
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
        throw new Error('Error with URL "' + req.url + '": ' + body);
      }
      if (cb) cb(parsed);
    }
  });
};

MpxClient.prototype.authenticate = function(user, pass) {
  return new Promise((resolve, reject) => {
    this.request({
      url: `https://identity.auth.theplatform.eu/idm/web/Authentication/signIn?schema=1.1&form=json&`,
      auth: {user: user, pass: pass},
      body: {
        'signIn': {
          'duration': 30,
          'idleTimeout': 0
        }
      }
    }, (parsed) => {
      this.mpxToken = parsed.signInResponse;
      resolve();
    });
  });
}

MpxClient.prototype.init = function(config) {
  this.media = new MediaDataService(this);
}

function MediaDataService(client) {
  this.client = client;
  this.init();
}

MediaDataService.prototype.init = function() {
  this.media = new mpxObject(this.client, {object: 'Media'});
  this.category = new mpxObject(this.client, {object: 'Category'});
}

module.exports.MpxClient = MpxClient;
