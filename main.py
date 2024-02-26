import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# token = os.environ['TOKEN']
# topic = os.environ['TOPIC']

COMMOM_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
    }

def tzgg():
    url = "https://jwc.cuit.edu.cn/tzgg.htm"
    response = requests.get(url, headers=COMMOM_HEADERS)
    if response.status_code == 200:
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        divs = soup.find_all('div', class_='title')
        result = ""
        for div in divs[0:3]:
            h5 = div.find('h5', class_='col_45')
            a = h5.find('a')
            a['href'] = urljoin(url, a['href'])
            h6_text = div.find('h6').get_text(strip=True)
            a.string = a.get_text(strip=True) + ' (' + h6_text + ')'
            a_text = a.prettify()
            result += a_text
        return "通知公告\n" + result if result is not None else ""
    else:
        print('Failed to get the webpage.')

def jwyx():
    url = "https://jwc.cuit.edu.cn/tzgg/jxyx.htm"
    response = requests.get(url, headers=COMMOM_HEADERS)
    if response.status_code == 200:
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        divs = soup.find_all('div', class_='title')
        result = ""
        for div in divs[0:3]:
            h5 = div.find('h5', class_='col_45')
            a = h5.find('a')
            a['href'] = urljoin(url, a['href'])
            h6_text = div.find('h6').get_text(strip=True)
            a.string = a.get_text(strip=True) + ' (' + h6_text + ')'
            a_text = a.prettify()
            result += a_text
        return "教学运行\n" + result if result is not None else ""
    else:
        print('Failed to get the webpage.')

# def pushplus():
#     content = tzgg() + "\n" + jwyx()
#     try:
#         with open('content.txt', 'r') as f:
#             old_content = f.read()
#     except FileNotFoundError:
#         old_content = ""

#     if content != old_content:
#         with open('content.txt', 'w') as f:
#             f.write(content)

#         url = 'http://www.pushplus.plus/send/'
#         payload = {
#             "token": token,
#             "title":"成都信息工程大学教务处通知",
#             "content":content,
#             "topic": topic,
#             "template":"html"
#         }
#         response = requests.post(url, data=payload)
#         data = response.json()
#         print(data.get('msg'))

def pushplus():
    content = tzgg() + "\n" + jwyx()
    print(content)

def main():
    pushplus()

main()