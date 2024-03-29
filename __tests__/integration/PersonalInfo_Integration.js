const request = require('supertest')
const app = require('../../app')


let token;

jest.setTimeout(30000)

beforeAll((done) =>{
    request(app)
    .post('/authenticate/login')
    .send({
        userName:"frank",
        password:"123"
    })
    .end((err,response)=>{
        token = response.body.token
        done();
    })
})

describe('GET /Pinfo', () =>{

    test('It responds with JSON', async () => {
        return await request(app)
          .get('/Pinfo')
          .set('Authorization', `Bearer ${token}`)
          .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.type).toBe('application/json');
          });
      });
})

describe('POST /updateInfo',() =>{
    test('Personal information change to post information',async() =>{
        return await request(app)
        .post('/updateInfo')
        .send({nameFamily:"wan"})
        .set('Authorization', `Bearer ${token}`)
        .then((response)=>{
            console.log(response.text)
            expect(response.text).toContain("wan")
        })
    })

describe('GET Connections',() =>{   
     test('Get user connections',async() =>{
           return await request(app)
           .get('/connections')
           .set('Authorization', `Bearer ${token}`)
           .then((response)=>{
              console.log(response.text)
             expect(response.text).toBeTruthy()
          })
        })
    });

})