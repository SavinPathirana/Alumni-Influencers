//Validates if the email ends with the university domain
const isValidUniversityEmail = (email) => {
    //Regex for standard academic domains 
    const uniEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.ac\.uk$/;
    return uniEmailRegex.test(email);
};

//Strong password
const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/; // min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    return passwordRegex.test(password);
};

//URL validation
const isValidUrl = (urlString) => {
    try {
        new URL(urlString);
        return true;
    } catch (e) {
        return false;
    }
};

module.exports = {
    isValidUniversityEmail,
    isStrongPassword,
    isValidUrl
};