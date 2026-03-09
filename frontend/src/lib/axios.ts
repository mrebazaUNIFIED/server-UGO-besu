import axios from 'axios';

export function DoRequest(post: any, token?: string): any {
    const headers = {
        "content-type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    return axios.post(import.meta.env.VITE_API_URL!,post,{headers: headers}).catch(function (error) { return undefined; });
}

