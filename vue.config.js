module.exports = {
	publicPath            : process.env.NODE_ENV === 'production' ? '/vcarendar/' : '/',
	transpileDependencies : [
		'vuetify'
	]
};