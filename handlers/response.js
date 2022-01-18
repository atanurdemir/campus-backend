module.exports = new (class {
  _data = {};
  _message = "Ok";
  _statusCode = 200;
  _headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    "Access-Control-Allow-Credentials": false,
  };

  constructor(code = 200, message = "Ok") {
    this._statusCode = code;
    this._message = message;
  }

  /**
   * Set headers `obj`.
   *
   * @param {Object} obj
   * @return {Object}
   * @public
   */
  header(obj) {
    this._headers = obj;
    return this;
  }

  /**
   * Set status `code`.
   *
   * @param {Number} code
   * @return {Object}
   * @public
   */
  status(code) {
    this._statusCode = code;
    return this;
  }

  /**
   * Set message `msg`.
   *
   * @param {Number} msg
   * @return {Object}
   * @public
   */
  message(msg = "") {
    this._message = msg;
    return this;
  }

  /**
   * Set send `obj`.
   *
   * @param {Number} obj
   * @return {Object}
   * @public
   */
  send(obj = {}) {
    let response = {
      statusCode: 200,
      headers: this._headers,
    };

    if (typeof obj !== "object") {
      obj = { data: obj };
    }

    this._statusCode === 200 ? (obj.status = 1) : (obj.status = 0);

    obj.message = this._message;
    response.body = JSON.stringify(obj);
    return response;
  }
})();
