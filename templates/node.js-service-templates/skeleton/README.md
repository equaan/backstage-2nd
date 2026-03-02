# {{ name }}

## Description
{{ description }}

## Development

Install dependencies:

npm install

Run in development:

npm run dev

## Build

npm run build

## Docker

Build image:

docker build -t {{ name }} .

Run container:

docker run -p {{ port_number }}:{{ port_number }} {{ name }}

## Health Endpoints

GET /health  
GET /ready