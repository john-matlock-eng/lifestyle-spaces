/**
 * Cognito Pre Sign-up Lambda Trigger
 * Auto-confirms all users without email verification
 * 
 * This function is triggered before a user is created in Cognito
 * and automatically confirms the user to skip email verification.
 */

exports.handler = async (event) => {
    console.log('Pre Sign-up trigger event:', JSON.stringify(event, null, 2));
    
    // Auto-confirm the user
    event.response.autoConfirmUser = true;
    
    // Auto-verify email (marks email as verified)
    event.response.autoVerifyEmail = true;
    
    console.log('User auto-confirmed and email auto-verified');
    
    return event;
};