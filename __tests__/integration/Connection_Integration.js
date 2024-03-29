const request = require('supertest')
const app = require('../../app')
const { PersonalUser, Usernis } = require('../../models/db');


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


describe('GET /connections' ,() => {
    test('It response with a connection list with id and name', async () =>{
        return request(app)
        .get('/connections')
        .set('Authorization', `Bearer ${token}`)
        .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain("frank wan")
          });

    })

})

describe('POST /createUser' ,() => {
    test("user's connections should include the created user", async () =>{
        return request(app)
        .post('/createUser')
        .send({
            nameFamily:"test",
            nameGiven:"test"
        })
        .set('Authorization', `Bearer ${token}`)
        .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.type).toBe('application/json');
          });

    })

    afterAll(async()=>{
        const user = await PersonalUser.findOne({userName:"frank"})
        user.connections.cnis.pop();
        await Usernis.findOneAndDelete({fullName:"test test"})
        await user.save()
    })

})
describe('GET /connection/:_id' ,() => {
    test('It response with a connection profile include personal information and friend information', async () =>{
        return request(app)
        .get('/connection/614974267dd4443287f05382')
        .set('Authorization', `Bearer ${token}`)
        .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain("frank wan")
            });

    })

})


describe('POST /connection/edit/:_id' ,() => {
    test('It response with an updated connection profile include personal information and friend information', async () =>{
        return request(app)
        .post('/connection/edit/614974267dd4443287f05382')
        .send({
            description:"this is for testing"
        })
        .set('Authorization', `Bearer ${token}`)
        .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain("edit successful")
            });

    })

})


