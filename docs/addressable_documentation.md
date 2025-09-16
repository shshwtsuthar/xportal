# OpenAPI Spec of the API:
# https://swagger.io/docs/specification/about/
openapi: "3.0.3"
info:
  version: 2.0.0
  title: Addressable
  description: A simple RESTful JSON web API that allows website, web and desktop application developers to easily implement address verification, geocoding and autocomplete for New Zealand and Australia
  contact:
    name: API Support
    email: sam@addressable.dev
    url: https://www.addressable.dev
  license:
    name: License
    url: https://www.addressable.dev/pages/terms
  termsOfService: https://www.addressable.dev/pages/terms
servers:
  - url: https://api.addressable.dev
paths:
  /v2/autocomplete:
    get:
      tags: ["address"]
      description: |
        Lookup possible addresses that match the partial address query value.
        4-6 numbers and characters is typically enough to identify an address.
      operationId: autocomplete
      parameters:
        - name: q
          in: query
          description: The address query string. Can be a partial address
          required: true
          schema:
            type: string
            example: "220 Queen St Auc"
        - name: country_code
          in: query
          description: "The ISO 3166 Country Code"
          required: true
          schema:
            type: string
            enum:
              - NZ
              - AU
        - name: type
          in: query
          description: |
            A comma separated list of field types. Accepted: [number, street, locality].
            Filters results to include only the types specified.
            Example usage: use the "street" filter to only include one result for each street, and exclude street-number-granularity results.
            Example usage: use the "locality" filter when running autocomplete for a suburb form field to exclude street or number results.
            Default will search all field types.
          required: false
          schema:
            type: string
            default: "number, street, locality"
        - name: max_results
          in: query
          description: "Maximum number of results to return. Must be an integer from 1 to 10."
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 10
            default: 5
      responses:
        '200':
          description: An array of matching address objects
          content:
            application/json:
              schema:
                type: array
                items:
                  oneOf:
                    - $ref: '#/components/schemas/AddressNZ'
                    - $ref: '#/components/schemas/AddressAU'
        '401':
          $ref: "#/components/responses/UnauthorizedError"
        '406':
          $ref: "#/components/responses/NotAcceptableError"
        '429':
          $ref: "#/components/responses/RateLimitedError"

  /v2/reverse:
    get:
      tags: ["address"]
      description: |
        Convert geographic coordinates into a human-readable address or place name
      operationId: reverse
      parameters:
        - name: lat
          in: query
          description: The latitude of the location to reverse geocode
          required: true
          schema:
            type: number
            example: -36.850712
            minimum: -90
            maximum: 90
        - name: lon
          in: query
          description: The longitude of the location to reverse geocode
          required: true
          schema:
            type: number
            example: 174.764605
            minimum: -180
            maximum: 180
      responses:
        '200':
          description: An array of matching address objects
          content:
            application/json:
              schema:
                type: array
                items:
                  oneOf:
                    - $ref: '#/components/schemas/AddressNZ'
                    - $ref: '#/components/schemas/AddressAU'
        '401':
          $ref: "#/components/responses/UnauthorizedError"
        '406':
          $ref: "#/components/responses/NotAcceptableError"
        '429':
          $ref: "#/components/responses/RateLimitedError"

  /v2/profile:
    get:
      tags: ["profile"]
      description: |
        Check identity or subscription expiry
      operationId: profile
      responses:
        '200':
          description: The user profile object
          content:
            application/json:
              schema:
                type: object
                properties:
                  email:
                    type: string
                    format: email
                  subscription_expires_on:
                    type: string
                    format: date
        '401':
          $ref: "#/components/responses/UnauthorizedError"
        '429':
          $ref: "#/components/responses/RateLimitedError"

components:
  schemas:
    AddressNZ:
      type: object
      properties:
        street_number:
          type: string
        street:
          type: string
        locality:
          type: string
        city:
          type: string
        region:
          type: string
        postcode:
          type: string
        meshblock:
          type: string
        lon:
          type: string
        lat:
          type: string
        formatted:
          type: string
    AddressAU:
      type: object
      properties:
        building_name:
          type: string
        unit_details:
          type: string
        street_number:
          type: string
        street:
          type: string
        locality:
          type: string
        region:
          type: string
        postcode:
          type: string
        meshblock:
          type: string
        lon:
          type: string
        lat:
          type: string
        formatted:
          type: string
  securitySchemes:
    ApiKeyAuth:
        type: apiKey
        name: api_key
        in: query
  responses:
    UnauthorizedError:
      description: API key is missing or invalid
    NotAcceptableError:
      description: Invalid query parameter values
    RateLimitedError:
      description: Rate limit exceeded
security:
  - ApiKeyAuth: []

# Documentation:
Authentication

All requests must be authenticated with a valid API key as a GET parameter. API keys are available in your account after free registration

A missing or invalid API key will result in a 401 response.

CORS: Cross-Origin Resource Sharing is enabled on the API endpoints so you can use the service from your javascript application.
Autocomplete

Description: Lookup possible addresses that match the partial address query value. 4-6 numbers and characters is typically enough to identify an address.

Endpoint: https://api.addressable.dev/v2/autocomplete

HTTP Method: GET
Parameter 	Description 	Example 	Required
q 	The address query string. Can be a partial address 	220 Queen St Auc 	Yes
country_code 	The ISO 3166 Country Code. Accepted: [AU, NZ] 	NZ 	Yes
api_key 	Your API Key 	O3xtxU8vlJ8M9hsTVD-6_g 	Yes
type 	A comma separated list of field types. Accepted: [number, street, locality]. Filters results to include only the types specified. Example usage: use the "street" filter to only include one result for each street, and exclude street-number-granularity results. Example usage: use the "locality" filter when running autocomplete for a suburb form field to exclude street or number results. Default will search all field types. 	street,locality 	No
max_results 	Maximum number of results to return. Must be an integer from 1 to 10. Default: 5. 	10 	No

Successful response (NZ):
[{ "street_number": "214-220", "street": "Queen Street", "locality": "Auckland Central", "city": "Auckland", "region": "Auckland", "postcode": "1010", "meshblock": "0437101", "lon": 174.765469, "lat": -36.849304, "formatted": "214-220 Queen Street, Auckland Central, Auckland" }]

Successful response (AU):
[{ "building_name": null, "unit_details": null, "street_number": "26-28", "street": "Ramsay Street", "locality": "Rochester", "region": "VIC", "postcode": "3561", "meshblock": "20098880000", "lon": "144.699065", "lat": "-36.359784", "formatted": "26-28 Ramsay Street, Rochester, VIC 3561" }]

Output fields for each result:

NZ: street_number street locality city region postcode meshblock lon lat formatted

AU: building_name unit_details street_number street locality region postcode meshblock lon lat formatted

Sample GET query:
https://api.addressable.dev/v2/autocomplete?api_key=YOUR_API_KEY&country_code=NZ&q=220+Queen+Auc

Sample cURL code:
curl "https://api.addressable.dev/v2/autocomplete?api_key=YOUR_API_KEY&country_code=NZ&q=220+Queen+Auc"
Examples

See working examples of the autocomplete API in action on JSFiddle. Just bring your own API key.

CoreJS Typeahead + Bootstrap

Awesomplete
Reverse Geocode

Description: Convert geographic coordinates into a human-readable address or place name.

Endpoint: https://api.addressable.dev/v2/reverse

HTTP Method: GET
Parameter 	Description 	Example 	Required
lat 	The latitude of the location 	-36.850712 	Yes
lon 	The longitude of the location 	174.764605 	Yes
api_key 	Your API Key 	O3xtxU8vlJ8M9hsTVD-6_g 	Yes

Successful response (NZ):
[{ "street_number": "214-220", "street": "Queen Street", "locality": "Auckland Central", "city": "Auckland", "region": "Auckland", "postcode": "1010", "meshblock": "0437101", "lon": 174.765469, "lat": -36.849304, "formatted": "214-220 Queen Street, Auckland Central, Auckland" }]

Successful response (AU):
[{ "building_name": null, "unit_details": null, "street_number": "26-28", "street": "Ramsay Street", "locality": "Rochester", "region": "VIC", "postcode": "3561", "meshblock": "20098880000", "lon": "144.699065", "lat": "-36.359784", "formatted": "26-28 Ramsay Street, Rochester, VIC 3561" }]

Output fields for each result:

NZ: street_number street locality city region postcode meshblock lon lat formatted

AU: building_name unit_details street_number street locality region postcode meshblock lon lat formatted

Sample GET query:
https://api.addressable.dev/v2/reverse?api_key=YOUR_API_KEY&lat=-36.850712&lon=174.764605

Sample cURL code:
curl "https://api.addressable.dev/v2/reverse?api_key=YOUR_API_KEY&lat=-36.850712&lon=174.764605"
Profile

Description: Check identity or subscription expiry

Endpoint: https://api.addressable.dev/v2/profile

HTTP Method: GET
Parameter 	Description 	Example 	Required
api_key 	Your API Key 	O3xtxU8vlJ8M9hsTVD-6_g 	Yes

Successful response:
{"email":"team@addressable.dev","subscription_expires_on":"2025-01-01"}

Sample GET query:
https://api.addressable.dev/v2/profile?api_key=YOUR_API_KEY

Sample cURL code:
curl "https://api.addressable.dev/v2/profile?api_key=YOUR_API_KEY"
Possible Error Responses:
HTTP Code 	Response
401 	

{"errors":[{"error_type":"request","message":"API key invalid"}]}

429 	

{"errors":[{"error_type":"request","message":"Rate limit exceeded"}]}

