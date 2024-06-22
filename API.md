# APIs

## /api/searchschool

`GET`

### request

`q`: search q for school

### responce

`status`: 200 or 404. you know what it means \
`result`?: school list

## /api/getbob

### request

`school`: school ID \
`edu`: edu ID

### responce

`status`: 200 or 404 \
`result`: mealServiceDietInfo

## /api/addwebhook

`GET`

### request

`url`: url of webhook \
`school`: school id \
`edu`: edu id

### responce

`status`: okay you know this
