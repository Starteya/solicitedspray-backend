const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');
const Route = require('../models/Route');
const routeHandlers = require('./routes');

const app = express();
app.use('/api/routes', routeHandlers);

let server;
let baseUrl;
let capturedSearch;
let capturedSkip;
let capturedLimit;

before(async () => {
  Route.countDocuments = async (search) => {
    capturedSearch = search;
    return 12;
  };
  Route.find = (search) => {
    capturedSearch = search;
    return {
      select() {
        return this;
      },
      skip(value) {
        capturedSkip = value;
        return this;
      },
      limit(value) {
        capturedLimit = value;
        return Promise.resolve([{ _id: 'route-1' }]);
      },
    };
  };

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/routes/search`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => {
  capturedSearch = undefined;
  capturedSkip = undefined;
  capturedLimit = undefined;
});

const search = async (params) => {
  const url = new URL(baseUrl);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url);
  return { response, body: await response.json() };
};

test('treats regex metacharacters in the query as literal text', async () => {
  const { response, body } = await search({ query: '[Red].* Rock' });

  assert.equal(response.status, 200);
  assert.equal(body.currentPage, 1);
  assert.equal(body.totalResults, 12);
  assert.equal(capturedSearch.$or[0].name.source, '\\[Red\\]\\.\\* Rock');
  assert.equal(capturedLimit, 10);
});

test('trims the query and applies the requested page and limit', async () => {
  const { response } = await search({ query: '  Red Rock  ', page: '3', limit: '25' });

  assert.equal(response.status, 200);
  assert.equal(capturedSearch.$or[0].name.source, 'Red Rock');
  assert.equal(capturedSearch.$or[0].name.test('Pictured Rocks'), true);
  assert.equal(capturedSkip, 50);
  assert.equal(capturedLimit, 25);
});

for (const page of ['abc', '0', '-1', '1.5', '2abc']) {
  test(`rejects invalid page value ${page}`, async () => {
    const { response, body } = await search({ query: 'Red Rock', page });

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Page must be a positive integer');
    assert.equal(capturedSearch, undefined);
  });
}

for (const limit of ['abc', '0', '-1', '1.5', '51']) {
  test(`rejects invalid limit value ${limit}`, async () => {
    const { response, body } = await search({ query: 'Red Rock', limit });

    assert.equal(response.status, 400);
    assert.match(body.error, /Limit must be a positive integer/);
    assert.equal(capturedSearch, undefined);
  });
}

test('rejects duplicate query parameters', async () => {
  const { response, body } = await search([['query', 'Red'], ['query', 'Rock']]);

  assert.equal(response.status, 400);
  assert.equal(body.error, 'A non-empty query parameter is required');
  assert.equal(capturedSearch, undefined);
});

test('rejects queries longer than 100 characters', async () => {
  const { response, body } = await search({ query: 'a'.repeat(101) });

  assert.equal(response.status, 400);
  assert.match(body.error, /cannot exceed 100 characters/);
  assert.equal(capturedSearch, undefined);
});
