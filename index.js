//Librerias y dependencias
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
var handlebars = require('express-handlebars');
const Recaptcha = require('express-recaptcha').RecaptchaV2;
const recaptcha = new Recaptcha('6LcoNy0pAAAAANL1RlKBWgjSPc2mn7qI5Gf59Xo3', '6LcoNy0pAAAAAFtE0DGF2NzXuf9oqN8AmVVYCpWQ');
const multer = require('multer');
const http = require('http');
const express = require('express');
const port = process.env.PORT;
const baseDatosModels = require('./models/database.js');

const {PASSWORD,ADMIN,PORT,SECRETKEY2} = process.env;

const app = express();

//Configuracion socket.io para las notificaciones realTime

const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);
io.on('connection', (socket) => {
	console.log('Usuario conectado...');
	socket.emit('mensajeServer', 'Hello, client!');
	socket.on('disconnect',()=>{
		console.log('Usuario descomectado...');
	});
});

//recursos que se van a cargar en el server 
app.use(express.static(__dirname+'/static'));


//Configuración del Servidor
app.set('view engine','ejs');// Temlate engine Ejs
app.set('views',path.join(__dirname,"./views"));//Template engine ejs
app.use(express.urlencoded({extended:false}));//request rewards

app.use(cookieParser());
app.use(express.json());
const jwt = require('jsonwebtoken');
const bodyParser= require('body-parser');

const utils = require('./middleware/uploadImg.js');

//middleware para verificar cliente
const {verifyToken} = require('./middleware/JWT.js');
//middleware para verificar admin
const {verifyToken2} = require('./middleware/JWT2.js');

let ext;

//--------------------------------------------------------------
let storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, './static/uploads')
  },
  filename: function (req, file, cb) {
    ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + utils.getContentType(ext))
  }
});

let upload = multer({ storage: storage });

//-----------------------------------------------------------------

//enruptamiento
app.get('/',(req,res)=>{
	res.clearCookie('transaccion');
  res.render('index.ejs')
});

app.get('/login',(req,res)=>{
	res.render('iniciarSesion.ejs');
});


app.post('/login',(req,res)=>{

 const {admin,password} = req.body;

 const dato= {
  admin,
  password
 }

   if(admin === ADMIN && password === PASSWORD){
   	const token = jwt.sign(dato,SECRETKEY2,{expiresIn:60 * 60 * 24}); // Guardar token en cookies
   	res.cookie('token2', token, { httpOnly: true, secure: true });
    res.redirect('/productos');
   }else{
   	res.json({INCORRECT:'Contraseña o usuario Incorrecto'});
   }
});
  
/* ADD */
app.get('/add',(req,res)=>{
	res.render('add.ejs');
});

app.get('/addImagen/:id',verifyToken2,(req,res)=>{
	baseDatosModels.getImagen(req,res);
});

app.post('/addImagen/:id',upload.single('img'),(req,res)=>{ 
	baseDatosModels.aggIMG(req,res);
});

app.post('/addPost',(req,res)=>{   
	baseDatosModels.aggDato(req,res);
});

// PRODUCTOS
app.get('/productos',verifyToken2,(req,res)=>{
  baseDatosModels.mostrarProductos(req,res);
});


// GET /editar/:id
app.get('/update/:id',verifyToken2,(req, res) => {
	baseDatosModels.mostrarUpdate(req,res);

});

// POST /editar/:id
app.post('/update/:id', (req, res) => {
 baseDatosModels.update(req,res);
});

//-------------------------------------------------------
// GET /eliminar/:id
app.get('/delete/:id',verifyToken2,(req, res) => {
 baseDatosModels.mostrarDelete(req,res);
});

//-------------------------------------------------------
// POST /eliminar/:id
app.post('/delete/:id', (req, res) => {
 baseDatosModels.deletee(req,res);
});


//-------------------------------------------------------
// Categorias
app.get('/categorias',verifyToken2,(req, res) => {
 baseDatosModels.getCategorias(req,res);
});

// Add -> Categorias
app.get('/addCategorias',verifyToken2,(req, res) => {
 res.render('addcategoria.ejs');
});

app.post('/addcategorias', (req, res) => {
	baseDatosModels.postCategorias(req,res);
});
// Update -> Categorias
app.get('/updateCategoria/:id',verifyToken2,(req,res)=>{
	baseDatosModels.mostrarUpdateC(req,res);
});

app.post('/updateCategoria/:id',(req,res)=>{
	baseDatosModels.updateCateg(req,res);
});

// Eliinar -> Categorias
app.get('/eliminarCategoria/:id',verifyToken2,(req,res)=>{
baseDatos.deleteCategoriaGET(req,res);
});

// GET clientes
app.get('/clientes',verifyToken,(req,res)=>{
	baseDatosModels.ClientesGET(req,res);
});

app.get('/cliente',(req, res) => {
 baseDatosModels.filtrar(req,res);
});
//-------------------------------------------------------
app.get('/detalles/:id',verifyToken,(req,res)=>{
	res.clearCookie('transaccion');
	baseDatosModels.detalles(req,res);
});
//-------------------------------------------------------
app.get('/loginUsers',(req,res)=>{
	baseDatosModels.loginUsers(req,res);
});
//------------------------------------------------------
app.post('/loginUsers',(req,res)=>{
  baseDatosModels.postLoginCliente(req,res);
})
//------------------------------------------------------
app.get('/registroUsers',(req,res)=>{
  baseDatosModels.registroUsers(req,res);
});
//------------------------------------------------------
app.post('/registroUsuariosPost',recaptcha.middleware.verify,(req,res)=>{
   if(!req.recaptcha.error){
    // verificacion exitosa de ReCatcha
     baseDatosModels.registroUsuariosPost(req,res); 
  } else{
    // verificacion no exitosa de ReCatcha
    res.send('Error en el reCAPTCHA');
  } 
})
//------------------------------------------------------
app.get('/comprar/:id',verifyToken,(req,res)=>{
  res.clearCookie('transaccion');
  baseDatosModels.comprar(req,res);
});
//------------------------------------------------------
app.post('/comprarPost',async (req,res)=>{
baseDatosModels.comprarPOST(req,res);
})
//------------------------------------------------------
app.get('/mensageDeRegistro',(req,res)=>{
const registro = req.cookies.registro;
if(typeof registro !== 'undefined'){
  res.json({mensaje:registro});
}else{
  res.json({mensaje:false});
}
})
//------------------------------------------------------
app.get('/eliminarMensajeRegistro',(req,res)=>{

if(typeof req.cookies.registro !== 'undefined'){
 res.clearCookie('registro'); 
 res.json({mensaje:'Mensaje_Eliminadooo'});
}else{
  res.json({mensaje:false});
}

})
//------------------------------------------------------
app.get('/transaction',(req,res)=>{

const transaction = req.cookies.transaccion;

if(typeof transaction !== 'undefined'){
 console.log('transaction desde controllers',transaction);
 res.json({transaction}); 
}else{
res.json({message:false});
}

});
//------------------------------------------------------
app.get('/eliminarTransaction',(req,res)=>{
 res.clearCookie('transaccion');
 res.json({message:'transaccion eliminada'});
})
//------------------------------------------------------
app.get('/usuarios',(req,res)=>{
baseDatosModels.mostrarUsers(req,res);
})
//------------------------------------------------------
//------------------------------------------------------
app.get('/compras',(req,res)=>{
baseDatosModels.MostrarCompras(req,res);
})
//------------------------------------------------------
app.get('/addUser',(req,res)=>{
baseDatosModels.addUsers(req,res);
})
//------------------------------------------------------
app.post('/addUser',(req,res)=>{
  baseDatosModels.addUsersPost(req,res);
})
//------------------------------------------------------
app.get('/updateUser/:id',(req,res)=>{
baseDatosModels.updateUser(req,res);
})
//------------------------------------------------------
app.post('/updateUser/:id',(req,res)=>{
baseDatosModels.updateUserPost(req,res);
})
//------------------------------------------------------
app.get('/deleteUser/:id',(req,res)=>{
baseDatosModels.deleteUser(req,res);
});
//------------------------------------------------------
app.get('/deleteCompra/:id',(req,res)=>{
baseDatosModels.deleteCompra(req,res);
})
//------------------------------------------------------
//logout cliente
app.get('/logout',(req, res) => {
  //metodo para borrar la cookie
  res.clearCookie('token');
  res.redirect('/');
});
//------------------------------------------------------
//logout administrador
app.get('/logout2',(req, res) => {
  res.clearCookie('token2');
  res.redirect('/');
});
//------------------------------------------------------
//Metodo para manejar rutas no encontradas
app.get('/*',(req,res)=>{
res.render('notFound.ejs')
});
//-------------------------------------------------------

server.listen(port,()=>{
  console.log(`Servidor corriendo exitosamente en el puerto ${port}`);
});

