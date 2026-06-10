// Logo institucional de la Universidad Continental
// Si necesitas cambiar el logo, solo modifica esta constante
const LOGO_URL = 'https://ci6.googleusercontent.com/proxy/h9njXK3mllYy_7gMz4cP0NM0BxxxRAQ5ioBxUdJYtmRv1hU1TSKJAaP584AykBcLNRJYOWbMuHYUF-QuDxeR7mO6OnxqnzarGgxD7KrJ-yEq2NCsjb2bW9jfqhdh9YxzU5Wz5p5cfYz6qqDybm1KzlxFs0XQdBT7ILg=s0-d-e1-ft#https://gallery.mailchimp.com/656fbe8d69172395c3bfc518a/images/1aef640b-0bc8-4eea-84d5-74078777589a.png';

export function getBaseTemplate(content: string, attentionAreaName: string = 'Hub de Información'): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
    <div style="background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #ffffff; padding: 20px 30px; border-bottom: 2px solid #000000; display: flex; align-items: center;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="left" valign="middle">
                            <img src="${LOGO_URL}" alt="Universidad Continental" style="max-width: 180px; height: auto; display: block;">
                        </td>
                        <td align="right" valign="middle">
                            <h1 style="margin: 0; font-size: 20px; color: #333; font-weight: normal;">${attentionAreaName}</h1>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 30px; background-color: #ffffff;">
                ${content}
            </div>
            
            <!-- Footer -->
            <div style="border-top: 20px solid #000000; background-color: #ffffff; padding: 0;">&nbsp;</div>
            <div style="display:none;font-size:0px;color:transparent;line-height:0;max-height:0;mso-hide:all;">
                ${new Date().getTime()}
            </div>
        </div>
    </div>
</body>
</html>`;
}
